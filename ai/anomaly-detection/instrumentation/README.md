# Telemetry instrumentation (isolated review copy)

`telemetry.js` is the single drop-in that satisfies Phase 0 for the detector.
It lives here (AI component) for review; it is **not yet wired into the
services**. Nothing in the teammates' controllers changes.

What it produces per request:
- a Prometheus `/metrics` endpoint (`http_requests_total`,
  `http_request_duration_seconds`, `http_response_bytes`, + default Node metrics);
- one `http_access` JSON log line (method, route template, status, duration,
  bytes in/out, ip, user-agent, request_id) → stdout → Loki.

Why this is enough: the detector reads auth failures, validation rejections and
bad-signature hits straight off `route + status` in `http_access`, so no
controller edits are needed. Explicit `login_failed` / `validation_rejected`
events (SIEM enrichment) are optional and deferred.

## Wiring (apply at review time, per service)

For each of `auth-service`, `payment-api`, `psp-simulator`:

1. Add the dependency:

   ```jsonc
   // package.json → dependencies
   "prom-client": "^15.1.0"
   ```

2. Copy `telemetry.js` into the service as `src/middleware/telemetry.js`
   (must live inside the service — each has its own Docker build context).

3. Wire it in `src/application.js` (import near the other imports, mount **before
   the routes** so every request is timed):

   ```js
   import { createTelemetry } from "./middleware/telemetry.js";
   import { config } from "./config.js";        // if not already imported
   import { log } from "./utils.js";             // reuse the service's logger

   const telemetry = createTelemetry({ serviceName: config.serviceName, logger: log });
   application.use(telemetry.middleware);
   application.get("/metrics", telemetry.metricsHandler);
   ```

   - `payment-api`: place `application.use(telemetry.middleware)` right after
     `application.use(cors())`, before the `/api/donations/webhook` route, so the
     raw-body webhook is still timed.
   - `psp-simulator` / `auth-service`: place it right after the `helmet()` /
     `cors()` setup, before the routers.

4. **Do not expose `/metrics` on the hotspot.** It stays internal (scraped by
   Prometheus only), per the exposure matrix in `docs/architecture.md`.

## Prometheus scrape (infra, Phase 0 cont.)

Add a job per service to `infra/observability/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: services
    scrape_interval: 5s
    static_configs:
      - targets: ["auth-service:3001", "payment-api:3002", "psp-simulator:3003"]
```

Container CPU/memory come from **cAdvisor** (separate scrape job) — no app code.

## Verify

```bash
curl -s localhost:3002/metrics | head        # metrics present
curl -s localhost:3002/health                 # then check stdout for http_access
```

Each request should print an `http_access` line and bump `http_requests_total`.
