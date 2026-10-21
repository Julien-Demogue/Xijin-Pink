# Alert Contract

The message the ML detector publishes about an **Anomaly**. Shared by the
detector (producer) and the remediation engine, SIEM and dashboard (consumers).
Delivery: `POST /alerts` to the remediation engine on the internal network, plus
a JSON log line (→ Loki).

## Schema

| Field | Type | Notes |
| --- | --- | --- |
| `alertId` | string | Stable per anomaly; `firing` and `resolved` share it. |
| `status` | `firing` \| `resolved` | `resolved` = detector-confirmed return to normal. |
| `detectedAt` | ISO-8601 | UTC. |
| `window` | `{start,end}` | The scoring window. |
| `scope` | `{kind,name}` | `kind: service\|platform`; `name` e.g. `payment-api`. |
| `score` | number | Anomaly score for the window. |
| `threshold` | number | Learned threshold in effect. |
| `severity` | `low`\|`medium`\|`high` | Derived from score/threshold ratio. |
| `category` | `{label,confidence}` | `label`: `availability`\|`auth-abuse`\|`injection`\|`exfiltration`\|`unknown`. |
| `evidence.topFeatures` | array | `{name, observed, expected}`, most-deviating first. |
| `evidence.topSources` | array | `{ip, share}` — for the WAF to block. |
| `model` | `{name,version,featureSpec}` | Traceability. |

## Example

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
    "topFeatures": [{ "name": "latency_p95_ms", "observed": 2400, "expected": 85 }],
    "topSources": [{ "ip": "192.168.137.42", "share": 0.91 }]
  },
  "model": { "name": "if+pca", "version": "2026-10-20.1", "featureSpec": "v1" }
}
```

## Response mapping (remediation's side, for reference)

| `category.label` | Typical automatic response | Recovery proof |
| --- | --- | --- |
| `availability` | restart/scale target + tighten WAF rate limit | new donation → `paid` |
| `auth-abuse` | WAF block top IPs + lock rate on `/login` | login works for a legit account |
| `injection` | WAF rule + rotate/verify, restore if needed | integrity check passes |
| `exfiltration` | contain (block egress/IP) + revoke | no further anomalous `bytes_out` |
| `unknown` | generic playbook (restart + verify) | new donation → `paid` |
