# Anomaly Detection — Domain Model

Design reference for the ML anomaly detector. It reads telemetry the platform
emits, decides whether the current behaviour is normal or suspect, and raises a
structured **Alert** into the remediation chain. **No hard-coded thresholds** —
the threshold itself is learned from normal data.

Owner: AI/Data (detector + RAG). Depends on Phase 0 telemetry
([../../docs/api/telemetry-contract.md](../../docs/api/telemetry-contract.md)).

## 1. Bounded contexts

```
Telemetry (upstream, read-only)   Loki (logs) + Prometheus (metrics)
                                        │
DETECTION (live)        Observation → Score → Verdict → Anomaly ──Alert──► Remediation
                                        │                 ▲                    │
                                        ▼                 └──RemediationEvent──┘
                                 /metrics + JSON log → Grafana / SIEM / dashboard

DATASET (offline)       Scenario → Run → labeled Observation → Baseline + Evaluation
```

## 2. Ubiquitous language

| Term | Meaning |
| --- | --- |
| **Signal** | One raw telemetry item: a metric sample or a log line. Read-only; produced upstream. |
| **Scope** | What an observation is about: a service (`waf`, `payment-api`, `auth-service`, `psp-simulator`) or the whole platform. |
| **Window** | Fixed time slice, **10 s long, stepping every 5 s**. |
| **Observation** | The feature vector for one scope over one window. The row the model sees. |
| **FeatureSpec** | Versioned list of features + how each is computed. Training and live scoring share one. |
| **Baseline** | Learned "normal": scaler + model + threshold, versioned together. |
| **Score** | Continuous distance from the baseline. |
| **Threshold** | Learned from scores on held-out normal data (e.g. 99.5th percentile). Never hand-picked. |
| **Verdict** | Normal / suspect for one observation. |
| **Anomaly** | Suspect verdicts that persist on one scope (k of last n). Has a lifecycle. Core object. |
| **Category** | Suspected incident type: `availability`, `auth-abuse`, `injection`, `exfiltration`, `unknown`. |
| **Evidence** | Why it fired: top deviating features (observed vs expected) + top source IPs. |
| **Alert** | The message published about an Anomaly. The contract with remediation / SIEM / dashboard. |
| **Scenario / Run / Label** | Offline. Scenario = scripted traffic pattern. Run = one timed execution with a manifest of start/end times. Label = does a window overlap an attack in the manifest. |

## 3. Anomaly lifecycle

```
NORMAL ─suspect→ PENDING ─k of n suspect→ FIRING ─m normal in a row→ RESOLVED
                   └─back to normal→ NORMAL
```

- `FIRING` → POST Alert with `status: firing`.
- `RESOLVED` → POST Alert with `status: resolved` = the detector's **independent**
  confirmation that behaviour returned to normal (not the same as a container
  restarting).
- Timing target for the 60 s video: attack → `FIRING` in ~15–20 s ⇒ 10 s window,
  5 s step, k = 3.

## 4. Decisions

- **D1 — Observation = one service over one window**, not per request. Attacks
  (DoS, brute force, scraping) are patterns over time. No per-IP observations
  (all normal traffic comes from one generator machine, so "normal per IP" is
  meaningless); source IPs live in Evidence instead, for the WAF to block.
- **D2 — Read the WAF log first.** If a service dies it stops logging; the WAF
  still sees its 502/504 and latency. Signal priority: WAF access log → app
  events → container CPU/mem → optional canary donation.
- **D3 — Normal traffic must include normal mistakes** (wrong passwords,
  abandoned/failed checkouts, 404s). Otherwise the model learns "any 401 =
  attack", which is a hidden hard-coded rule.
- **D4 — Two stages.** Stage 1 (Isolation Forest + PCA reconstruction, trained on
  **normal only**) answers "is this abnormal?" and generalises to unseen attacks;
  per-feature reconstruction error → Evidence. Stage 2 (GradientBoosting on
  labeled runs) answers "what kind?"; below a confidence floor → `unknown` →
  generic playbook.
- **D5 — Push alerts, publish scores.** POST Alert to the remediation engine on
  the internal network; write the Alert to the JSON log (→ Loki/SIEM); expose
  `anomaly_score{scope}`, `anomaly_threshold`, `anomaly_state{scope}` on
  `/metrics` for Grafana (before/during/after).
- **D6 — Remediation suppresses self-inflicted anomalies.** Remediation sends a
  `RemediationEvent` (started/finished). While one is open on a scope, no new
  anomaly opens there; those windows are excluded from retraining.
- **D7 — Split by run, not at random** (neighbouring windows correlate). Train =
  normal runs; threshold = a separate normal run; test = mixed runs with attacks.

## 5. Alert contract (proposed — shared with remediation/SIEM/dashboard)

Canonical copy lives in [../../docs/api/alert-contract.md](../../docs/api/alert-contract.md).

```json
{
  "alertId": "anm_7f3c1a",
  "status": "firing",
  "detectedAt": "2026-10-20T14:03:12Z",
  "window": { "start": "2026-10-20T14:02:57Z", "end": "2026-10-20T14:03:07Z" },
  "scope": { "kind": "service", "name": "payment-api" },
  "score": 0.93,
  "threshold": 0.71,
  "severity": "high",
  "category": { "label": "availability", "confidence": 0.86 },
  "evidence": {
    "topFeatures": [
      { "name": "latency_p95_ms", "observed": 2400, "expected": 85 },
      { "name": "error_rate_5xx", "observed": 0.74, "expected": 0.01 }
    ],
    "topSources": [{ "ip": "192.168.137.42", "share": 0.91 }]
  },
  "model": { "name": "if+pca", "version": "2026-10-20.1", "featureSpec": "v1" }
}
```

## 6. Features (FeatureSpec v2, per scope per window)

From the `http_access` log unless noted. Heavy-tailed features are log1p-scaled
before standardisation (so ordinary bursts don't look anomalous).

- `req_count`, `req_rate_per_s`
- `error_rate_4xx`, `error_rate_5xx`
- `latency_p50_ms`, `latency_p95_ms`
- `bytes_out_p95`, `bytes_out_sum`, `bytes_out_per_req` (exfiltration vs scraping)
- `distinct_ips`, `top_ip_share`
- `distinct_routes`, `top_route_share` (scraping/enumeration signal)
- `auth_fail_ratio` (401 rate — brute force), `webhook_invalid_sig_count`
- `cpu_cores`, `mem_mb` (Prometheus, from each service's prom-client `/metrics`;
  joined per window by `detector/resources.py`)

**Thresholds are per-scope** (learned at a quantile from held-out normal, with a
global fallback): a subtle attack on a quiet service — e.g. an auth 401 burst —
isn't masked by a noisier service's variance.

## 7. Evaluation (for the dossier)

- Precision / recall per window, and per category.
- Share of attacks detected (any window during the attack fires).
- **Detection delay** (attack start → `FIRING`) — feeds RTO in PCA/PRA.
- False alarms per hour on pure normal traffic.
- Stage-1 Isolation Forest vs PCA (vs optional autoencoder) compared on the same
  split.
