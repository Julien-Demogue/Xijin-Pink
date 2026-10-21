# Telemetry Contract (Phase 0)

What every service must emit so the ML detector, the SIEM and the dashboard have
real data. Two channels: **structured JSON logs** (→ Loki) and **Prometheus
metrics** (→ `/metrics`). This is the dependency for anomaly detection — it ships
first.

## 1. Access log (every HTTP request)

Emitted by each service and, above all, by the **WAF** (sole ingress — it still
sees a request even when the target service is down). One JSON line per request
to stdout, reusing the existing `log()` helper (so the type key is `message`):

```json
{
  "timestamp": "2026-10-20T14:03:07.421Z",
  "service": "waf",
  "level": "info",
  "message": "http_access",
  "method": "POST",
  "route": "/api/donations/checkout",
  "status": 201,
  "duration_ms": 84,
  "bytes_in": 142,
  "bytes_out": 318,
  "ip": "192.168.137.42",
  "user_agent": "Mozilla/5.0 ...",
  "request_id": "req_9c1f"
}
```

Rules:
- `route` is the **template**, not the concrete path (`/checkout/:id`, not
  `/checkout/sess_abc`) — keeps cardinality bounded.
- `ip` is the client IP (behind the WAF: from `X-Forwarded-For`, left-most).
- Never log request bodies, tokens, passwords, or the webhook secret.
- The detector keys on `message == "http_access"`. This single line is produced
  by the drop-in middleware in
  [../../ai/anomaly-detection/instrumentation/](../../ai/anomaly-detection/instrumentation/)
  — no controller changes.

## 2. Business events

`http_access` (above) is the only event the detector **requires** — auth
failures, validation rejections and bad-signature hits are read off
`route + status`:

| Detector signal | Derived from `http_access` |
| --- | --- |
| auth failure (brute force) | `route = /api/auth/login`, `status = 401` |
| injection / bad input probing | `status = 400` |
| invalid webhook signature | `route = /api/donations/webhook`, `status = 401` |

The existing business events stay as-is and feed the SIEM/dashboard:
`checkout_created`, `webhook_received`, `webhook_invalid_signature`,
`payment_confirmed`, `account_created`.

**Optional enrichment (deferred):** explicit `login_failed` /
`validation_rejected` events give the SIEM a cleaner audit trail than inferring
from status codes. Not needed for FeatureSpec v1. If added, carry `ip` and
`request_id` only — never the submitted credentials or payload.

## 3. Prometheus metrics (`/metrics` per service)

Use `prom-client`. Minimum set:

- `http_requests_total{service,route,method,status}` — counter
- `http_request_duration_seconds{service,route}` — histogram
- `http_response_bytes{service,route}` — histogram (exfiltration signal)
- default Node process metrics (CPU, mem, event loop)

Container CPU/memory come from **cAdvisor**, scraped by Prometheus — no app code
needed.

## 4. Who emits what

| Scope | Source of truth |
| --- | --- |
| request rate, status mix, latency, bytes, IPs | **WAF access log** (primary) |
| auth failures / successes | auth-service events |
| payment / webhook anomalies | payment-api events |
| CPU / memory per container | cAdvisor → Prometheus |

## 5. Implementation note

Added as shared middleware in each Node service (`src/middleware/telemetry.js`):
a `prom-client` registry + a request-logging middleware reusing the existing
`log()` helper. The WAF emits the same `http_access` shape. Until the WAF exists,
the per-service access logs are enough to start building the dataset.
