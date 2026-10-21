// Shared telemetry middleware for the Node services (Phase 0).
//
// Drop-in, framework-native (Express), zero controller changes. Records one
// `http_access` JSON log line and Prometheus metrics per request. The anomaly
// detector derives its features from these (request rate, status mix, latency,
// response bytes, source IPs). Auth failures / validation rejections are read
// off `route + status`, so no business logic is touched.
//
// Isolated review copy. When approved, copy this file into each service as
// `src/middleware/telemetry.js` (per-service Docker build context) and add the
// ~2 lines of wiring shown in the README. Requires `prom-client`.

import crypto from "node:crypto";
import client from "prom-client";

function defaultLogger(level, message, details = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...details }));
}

// Route *template*, not the concrete path, to bound label cardinality.
function routeLabel(request) {
  if (request.route && request.route.path) {
    const base = request.baseUrl || "";
    const path = Array.isArray(request.route.path) ? request.route.path[0] : request.route.path;
    return `${base}${path}` || "/";
  }
  // Unmatched (e.g. 404): mask id-like segments so scans don't explode cardinality.
  const raw = (request.path || request.originalUrl || "unknown").split("?")[0];
  const masked = raw
    .split("/")
    .map((seg) => (/^\d+$/.test(seg) || /[0-9a-f-]{16,}/i.test(seg) ? ":id" : seg))
    .join("/");
  return masked || "/";
}

// Client IP behind the WAF: left-most X-Forwarded-For, else the socket peer.
function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket?.remoteAddress || "";
}

export function createTelemetry({ serviceName, logger = defaultLogger } = {}) {
  const register = new client.Registry();
  register.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register });

  const httpRequests = new client.Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["route", "method", "status"],
    registers: [register],
  });
  const httpDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["route", "method"],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });
  const httpResponseBytes = new client.Histogram({
    name: "http_response_bytes",
    help: "HTTP response size in bytes",
    labelNames: ["route"],
    buckets: [128, 512, 2048, 8192, 32768, 131072, 524288],
    registers: [register],
  });

  function middleware(request, response, next) {
    const start = process.hrtime.bigint();
    const requestId =
      (typeof request.headers["x-request-id"] === "string" && request.headers["x-request-id"]) ||
      `req_${crypto.randomUUID().slice(0, 8)}`;
    response.setHeader("x-request-id", requestId);

    response.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const route = routeLabel(request);
      const status = response.statusCode;
      const bytesOut = Number(response.getHeader("content-length")) || 0;
      const bytesIn = Number(request.headers["content-length"]) || 0;

      httpRequests.inc({ route, method: request.method, status });
      httpDuration.observe({ route, method: request.method }, durationMs / 1000);
      httpResponseBytes.observe({ route }, bytesOut);

      // Never log bodies, tokens, passwords, or the webhook secret.
      logger("info", "http_access", {
        method: request.method,
        route,
        status,
        duration_ms: Math.round(durationMs),
        bytes_in: bytesIn,
        bytes_out: bytesOut,
        ip: clientIp(request),
        user_agent: request.headers["user-agent"] || "",
        request_id: requestId,
      });
    });

    next();
  }

  async function metricsHandler(request, response) {
    response.set("Content-Type", register.contentType);
    response.end(await register.metrics());
  }

  return { middleware, metricsHandler, register };
}
