"""FeatureSpec v1 — turn http_access log lines into windowed Observations.

One Observation = one scope (service) over one time window. This is the row the
model sees. Features are computed from the WAF/service `http_access` log only
(see docs/api/telemetry-contract.md); container CPU/mem (Prometheus) join in v2.

The scope of a request is derived from its route prefix, so a single WAF access
log attributes each request to the target service.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

import numpy as np
import pandas as pd

FEATURE_SPEC_VERSION = "v2"

# Ordered feature list — training and live scoring MUST share this order.
# The log-derived features are computed here; `cpu_cores` / `mem_mb` come from
# Prometheus and are filled in by detector.resources.attach() (0.0 until then).
FEATURES: list[str] = [
    "req_count",
    "req_rate_per_s",
    "error_rate_4xx",
    "error_rate_5xx",
    "latency_p50_ms",
    "latency_p95_ms",
    "bytes_out_p95",
    "bytes_out_sum",
    "bytes_out_per_req",   # mean response size: separates scraping from exfiltration
    "distinct_ips",
    "top_ip_share",
    "distinct_routes",
    "top_route_share",
    "auth_fail_ratio",
    "webhook_invalid_sig_count",
    "cpu_cores",           # from Prometheus (process_cpu_seconds_total rate)
    "mem_mb",              # from Prometheus (process_resident_memory_bytes)
]

# Features that come from Prometheus, not the logs (filled by resources.attach).
METRIC_FEATURES = ["cpu_cores", "mem_mb"]

WINDOW_S = 10.0
STEP_S = 5.0


def scope_for_route(route: str) -> str:
    """Attribute a request to a service from its route template prefix."""
    if route.startswith("/api/auth"):
        return "auth-service"
    if route.startswith("/api/donations"):
        return "payment-api"
    if route.startswith("/checkout") or route.startswith("/sessions"):
        return "psp-simulator"
    return "other"


@dataclass
class _Events:
    """Column arrays for one scope, sorted by time."""

    t: np.ndarray
    status: np.ndarray
    duration_ms: np.ndarray
    bytes_out: np.ndarray
    ip: list[str]
    route: list[str]


def _group_by_scope(records: list[dict]) -> dict[str, _Events]:
    buckets: dict[str, dict[str, list]] = {}
    for r in records:
        route = r.get("route", "")
        scope = r.get("scope") or scope_for_route(route)
        b = buckets.setdefault(
            scope, {"t": [], "status": [], "duration_ms": [], "bytes_out": [], "ip": [], "route": []}
        )
        b["t"].append(float(r["timestamp"]))
        b["status"].append(int(r.get("status", 0)))
        b["duration_ms"].append(float(r.get("duration_ms", 0.0)))
        b["bytes_out"].append(float(r.get("bytes_out", 0.0)))
        b["ip"].append(str(r.get("ip", "")))
        b["route"].append(route)

    out: dict[str, _Events] = {}
    for scope, b in buckets.items():
        order = np.argsort(np.asarray(b["t"], dtype=float), kind="stable")
        out[scope] = _Events(
            t=np.asarray(b["t"], dtype=float)[order],
            status=np.asarray(b["status"], dtype=int)[order],
            duration_ms=np.asarray(b["duration_ms"], dtype=float)[order],
            bytes_out=np.asarray(b["bytes_out"], dtype=float)[order],
            ip=[b["ip"][i] for i in order],
            route=[b["route"][i] for i in order],
        )
    return out


def _window_features(ev: _Events, lo: int, hi: int) -> dict[str, float]:
    """Features for the half-open slice [lo, hi) of one scope's sorted events."""
    n = hi - lo
    if n == 0:
        return {f: 0.0 for f in FEATURES}

    status = ev.status[lo:hi]
    duration = ev.duration_ms[lo:hi]
    bytes_out = ev.bytes_out[lo:hi]
    ips = ev.ip[lo:hi]
    routes = ev.route[lo:hi]

    is_4xx = (status >= 400) & (status < 500)
    is_5xx = (status >= 500) & (status < 600)
    is_401 = status == 401

    ip_counts = Counter(ips)
    route_counts = Counter(routes)
    top_ip = max(ip_counts.values())
    top_route = max(route_counts.values())

    webhook_bad_sig = sum(
        1 for route, s in zip(routes, status) if "webhook" in route and s == 401
    )

    return {
        "req_count": float(n),
        "req_rate_per_s": n / WINDOW_S,
        "error_rate_4xx": float(is_4xx.mean()),
        "error_rate_5xx": float(is_5xx.mean()),
        "latency_p50_ms": float(np.percentile(duration, 50)),
        "latency_p95_ms": float(np.percentile(duration, 95)),
        "bytes_out_p95": float(np.percentile(bytes_out, 95)),
        "bytes_out_sum": float(bytes_out.sum()),
        "bytes_out_per_req": float(bytes_out.mean()),
        "distinct_ips": float(len(ip_counts)),
        "top_ip_share": top_ip / n,
        "distinct_routes": float(len(route_counts)),
        "top_route_share": top_route / n,
        "auth_fail_ratio": float(is_401.mean()),
        "webhook_invalid_sig_count": float(webhook_bad_sig),
        # Placeholders; filled from Prometheus by resources.attach().
        "cpu_cores": 0.0,
        "mem_mb": 0.0,
    }


def extract_observations(
    records: list[dict],
    window_s: float = WINDOW_S,
    step_s: float = STEP_S,
    t0: float | None = None,
    t_end: float | None = None,
) -> pd.DataFrame:
    """Sliding-window feature extraction.

    Returns a DataFrame with columns FEATURES + ['scope', 'window_start',
    'window_end'], one row per (scope, window). Empty windows (service silent)
    are emitted as zero rows so a going-dark service is observable.
    """
    if not records:
        return pd.DataFrame(columns=FEATURES + ["scope", "window_start", "window_end"])

    by_scope = _group_by_scope(records)
    all_t = np.concatenate([ev.t for ev in by_scope.values()])
    start = float(all_t.min()) if t0 is None else t0
    stop = float(all_t.max()) if t_end is None else t_end

    starts = np.arange(start, max(stop - window_s, start) + step_s, step_s)
    rows: list[dict] = []
    for scope, ev in by_scope.items():
        if scope == "other":
            continue
        for ws in starts:
            lo = int(np.searchsorted(ev.t, ws, side="left"))
            hi = int(np.searchsorted(ev.t, ws + window_s, side="left"))
            feats = _window_features(ev, lo, hi)
            feats["scope"] = scope
            feats["window_start"] = float(ws)
            feats["window_end"] = float(ws + window_s)
            rows.append(feats)

    return pd.DataFrame(rows, columns=FEATURES + ["scope", "window_start", "window_end"])


def label_observations(obs: pd.DataFrame, manifest: list[dict]) -> pd.DataFrame:
    """Add `label` (0 normal / 1 attack) and `category` from a run manifest.

    A window is attack if it overlaps an attack episode on the same scope.
    manifest entries: {scope, category, start, end}.
    """
    obs = obs.copy()
    obs["label"] = 0
    obs["category"] = "normal"
    for entry in manifest:
        overlap = (
            (obs["scope"] == entry["scope"])
            & (obs["window_start"] < entry["end"])
            & (obs["window_end"] > entry["start"])
        )
        obs.loc[overlap, "label"] = 1
        obs.loc[overlap, "category"] = entry["category"]
    return obs
