# WAF

Sole ingress to the platform. Reverse-proxies the `frontend` and the business
APIs, and is the project's **only** place for rate limiting and request
filtering. Config: [`nginx.conf`](nginx.conf); runs as `nginx:1.27-alpine` in the
compose stack on port **8080**.

## What it does

- **Rate limiting** — 20 req/s per source IP, burst 40, `429` beyond (proven: a
  flood is throttled to the allowed rate).
- **Filtering** — blocks path traversal, SQLi, XSS and Log4Shell-style patterns
  in the path and query (`403`), and non-standard HTTP methods (`405`).
- **Sole ingress** — proxies `/` → frontend, `/api/auth/*` → auth-service,
  `/api/donations/*` → payment-api. The PSP, DB, Prometheus/Loki, Vault and the
  Docker API stay internal.
- **Real client IP** — sets `X-Forwarded-For`, which the services' telemetry
  middleware records, so app logs carry the true source IP.
- **Audit logs** — JSON access log (`service=waf`, `message=waf_access`) to
  stdout → Promtail → Loki, consumed by the **SOC dashboard** (blocked/limited
  requests, top source IPs).
- Hardening: `server_tokens off`, body size limit, security headers.

## Routing

| Path | Upstream |
| --- | --- |
| `/api/auth/` | `auth-service:3001` |
| `/api/donations/` | `payment-api:3002` |
| `/` | `frontend:5173` |

Point the red-team at the WAF to exercise it end-to-end:
`XIJIN_PAY=http://<host>:8080 python redteam/campaign.py --only availability`.

## Upgrade path (full OWASP CRS)

For production-grade rules, swap the image for `owasp/modsecurity-crs:nginx` and
set `BACKEND`; keep the rate-limit + JSON-log snippet. The current config is a
controllable lab WAF that already filters the common classes and feeds the SOC.
