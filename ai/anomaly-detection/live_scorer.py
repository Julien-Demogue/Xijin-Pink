"""Live anomaly scorer — the detector's online half.

Every STEP seconds it pulls the most recent http_access from Loki, builds the
latest window's Observation per scope, scores it with the trained baseline, runs
the anomaly lifecycle (k-of-n persistence), and on FIRING / RESOLVED:
  * POSTs an Alert to the remediation engine (REMEDIATION_URL), and
  * logs the Alert as JSON (→ Loki / SIEM).
It also publishes `anomaly_score`, `anomaly_threshold`, `anomaly_state` and
`anomaly_alerts_total` on /metrics for Grafana — the supervision hookup.

Config (env): LOKI_URL (default http://localhost:3100), REMEDIATION_URL
(optional), STEP_S, MODEL_DIR. Run:  uvicorn live_scorer:app --port 3010
"""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest

from detector.featurespec import FEATURES, WINDOW_S, extract_observations
from detector.persistence import load
from detector.resources import attach

LOKI_URL = os.environ.get("LOKI_URL", "http://localhost:3100")
REMEDIATION_URL = os.environ.get("REMEDIATION_URL") or None
STEP_S = float(os.environ.get("STEP_S", "5"))
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.dirname(__file__), "model_store"))
K, N, CLEAR = 3, 4, 3  # lifecycle: k-of-n suspect to fire, CLEAR normals to resolve

app = FastAPI(title="xijin-pink anomaly detector")

g_score = Gauge("anomaly_score", "Latest anomaly score", ["scope"])
g_threshold = Gauge("anomaly_threshold", "Learned threshold", ["scope"])
g_state = Gauge("anomaly_state", "0 normal, 1 pending, 2 firing", ["scope"])
c_alerts = Counter("anomaly_alerts_total", "Alerts raised", ["scope", "category"])

_recent_alerts: list[dict] = []


def _log(level, message, **details):
    print(json.dumps({"timestamp": datetime.now(timezone.utc).isoformat(),
                      "service": "anomaly-detector", "level": level, "message": message, **details}))


def _loki_recent(seconds: float) -> list[dict]:
    end = time.time()
    start = end - seconds
    # Exclude infra endpoints (Prometheus scrapes /metrics, health checks /health):
    # they are not business traffic and must not drive anomaly detection.
    query = ('{service=~"waf|payment-api|auth-service|psp-simulator"} | json '
             '| message=`http_access` | route!=`/metrics` | route!=`/health`')
    params = urllib.parse.urlencode({
        "query": query, "start": int(start * 1e9), "end": int(end * 1e9),
        "limit": 5000, "direction": "forward",
    })
    url = f"{LOKI_URL}/loki/api/v1/query_range?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            payload = json.load(resp)
    except Exception as exc:
        _log("warn", "loki_query_failed", error=str(exc))
        return []
    out = []
    for stream in payload.get("data", {}).get("result", []):
        for _ts, line in stream["values"]:
            try:
                rec = json.loads(line)
                iso = rec.get("timestamp")
                if isinstance(iso, str):
                    rec["timestamp"] = datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()
                out.append(rec)
            except Exception:
                continue
    return out


class ScopeState:
    def __init__(self):
        self.suspect_hist: list[bool] = []
        self.state = "NORMAL"
        self.normal_streak = 0
        self.alert_id: str | None = None
        self.category: dict = {"label": "unknown", "confidence": 0.0}

    def update(self, suspect: bool) -> str | None:
        """Advance the state machine. Returns 'firing'/'resolved' on a transition."""
        self.suspect_hist.append(suspect)
        self.suspect_hist = self.suspect_hist[-N:]
        event = None
        if self.state in ("NORMAL", "PENDING"):
            if suspect:
                self.state = "PENDING"
            if sum(self.suspect_hist) >= K:
                self.state = "FIRING"
                self.alert_id = f"anm_{uuid.uuid4().hex[:8]}"
                event = "firing"
            elif not suspect:
                self.state = "NORMAL"
        elif self.state == "FIRING":
            self.normal_streak = self.normal_streak + 1 if not suspect else 0
            if self.normal_streak >= CLEAR:
                self.state = "NORMAL"
                self.normal_streak = 0
                event = "resolved"
        return event


class Engine:
    def __init__(self):
        self.baseline = load(os.path.join(MODEL_DIR, "baseline.pkl"))
        try:
            self.stage2 = load(os.path.join(MODEL_DIR, "stage2.pkl"))
        except Exception:
            self.stage2 = None
        self.states: dict[str, ScopeState] = {}
        # Seed the known service scopes as NORMAL so the dashboard shows green in
        # the passive (no-traffic) state instead of "no data".
        for scope, thr in self.baseline.thresholds_.items():
            self.states[scope] = ScopeState()
            g_state.labels(scope=scope).set(0)
            g_score.labels(scope=scope).set(0.0)
            g_threshold.labels(scope=scope).set(thr)
        _log("info", "model_loaded", threshold=self.baseline.threshold_,
             per_scope=self.baseline.thresholds_, features=len(FEATURES))

    def tick(self):
        now = time.time()
        recs = _loki_recent(max(WINDOW_S * 3, 30))
        seen: set[str] = set()
        if recs:
            obs = extract_observations(recs, t_end=now)
            if not obs.empty:
                obs = attach(obs)  # cpu_cores / mem_mb from Prometheus (FeatureSpec v2)
                for scope, grp in obs.groupby("scope"):
                    grp = grp[(grp["window_end"] <= now) & (grp["req_count"] > 0)]
                    if grp.empty:
                        continue
                    row = grp.sort_values("window_start").iloc[-1]
                    score = float(self.baseline.score(row.to_frame().T)[0])
                    thr = self.baseline.threshold_for(scope)
                    g_score.labels(scope=scope).set(score)
                    g_threshold.labels(scope=scope).set(thr)
                    st = self.states.setdefault(scope, ScopeState())
                    event = st.update(score > thr)
                    g_state.labels(scope=scope).set({"NORMAL": 0, "PENDING": 1, "FIRING": 2}[st.state])
                    if event:
                        self._emit(scope, row, score, st, event)
                    seen.add(scope)

        # Scopes with no business traffic this tick: feed the lifecycle a "normal"
        # sample so an idle service clears back to NORMAL instead of staying stuck
        # firing. No traffic is not an anomaly (that is the WAF's 5xx signal).
        for scope, st in self.states.items():
            if scope in seen:
                continue
            event = st.update(False)
            g_score.labels(scope=scope).set(0.0)
            g_state.labels(scope=scope).set({"NORMAL": 0, "PENDING": 1, "FIRING": 2}[st.state])
            if event == "resolved":
                _log("info", "anomaly_alert", alertId=st.alert_id, status="resolved",
                     score=0.0, scope=scope, category=st.category["label"],
                     confidence=st.category["confidence"])

    def _emit(self, scope, row, score, st, event):
        if event == "firing":
            category = self.stage2.predict(row.to_frame().T)[0] if self.stage2 else st.category
            st.category = category  # remember it, so the matching resolve carries it too
        else:
            category = st.category
        ev = self.baseline.evidence(row)
        thr = self.baseline.threshold_for(scope)
        alert = {
            "alertId": st.alert_id,
            "status": event,
            "detectedAt": datetime.now(timezone.utc).isoformat(),
            "window": {"start": datetime.fromtimestamp(row["window_start"], timezone.utc).isoformat(),
                       "end": datetime.fromtimestamp(row["window_end"], timezone.utc).isoformat()},
            "scope": {"kind": "service", "name": scope},
            "score": round(score, 3), "threshold": round(thr, 3),
            "severity": "high" if score > 2 * thr else "medium",
            "category": category,
            "evidence": {"topFeatures": ev.top_features},
            "model": {"name": "if+pca", "version": self.baseline.version,
                      "featureSpec": self.baseline.feature_spec},
        }
        _log("alert", "anomaly_alert", alertId=alert["alertId"], status=event,
             score=round(score, 3), scope=scope,
             category=category["label"], confidence=category["confidence"])
        _recent_alerts.insert(0, alert)
        del _recent_alerts[50:]
        if event == "firing":
            c_alerts.labels(scope=scope, category=category["label"]).inc()
        if REMEDIATION_URL:
            try:
                req = urllib.request.Request(
                    REMEDIATION_URL, method="POST",
                    data=json.dumps(alert).encode(), headers={"content-type": "application/json"})
                urllib.request.urlopen(req, timeout=5).read()
            except Exception as exc:
                _log("warn", "remediation_post_failed", error=str(exc))


_engine: Engine | None = None


def _loop():
    while True:
        try:
            if _engine:
                _engine.tick()
        except Exception as exc:
            _log("error", "tick_failed", error=str(exc))
        time.sleep(STEP_S)


@app.on_event("startup")
def _startup():
    global _engine
    _engine = Engine()
    threading.Thread(target=_loop, daemon=True).start()


@app.get("/health")
def health():
    return {"status": "ok", "model_threshold": _engine.baseline.threshold_ if _engine else None}


@app.get("/alerts")
def alerts():
    return JSONResponse(_recent_alerts)


@app.get("/metrics")
def metrics():
    return PlainTextResponse(generate_latest().decode(), media_type=CONTENT_TYPE_LATEST)
