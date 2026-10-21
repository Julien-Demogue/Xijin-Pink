// Telemetry middleware: request correlation + access log + Prometheus metrics.
//
// Wired in src/application.js. Every request gets a `request_id` (propagated via
// the x-request-id header) and a request-scoped logger `request.log(...)`, so
// business and security events share the same id as their access-log line. One
// `http_access` JSON line is emitted per request. All of it goes to stdout →
// Promtail → Loki (central aggregation) and feeds the ML anomaly detector.
//
// Never logs bodies, tokens, passwords, or the webhook secret.

import crypto from "node:crypto";
import client from "prom-client";

// Route *template*, not the concrete path, to bound label cardinality.
function routeLabel(request) {
  if (request.route && request.route.path) {
    const base = request.baseUrl || "";
    const path = Array.isArray(request.route.path) ? request.route.path[0] : request.route.path;
    return `${base}${path}` || "/";
  }
  const raw = (request.path || request.originalUrl || "unknown").split("?")[0];
  return (
    raw
      .split("/")
      .map((seg) => (/^\d+$/.test(seg) || /[0-9a-f-]{16,}/i.test(seg) ? ":id" : seg))
      .join("/") || "/"
  );
}

// Client IP behind the WAF: left-most X-Forwarded-For, else the socket peer.
function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket?.remoteAddress || "";
}

export function createTelemetry({ serviceName, log }) {
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
    const incoming = request.headers["x-request-id"];
    const requestId =
      (typeof incoming === "string" && incoming) || `req_${crypto.randomUUID().slice(0, 8)}`;
    request.requestId = requestId;
    request.clientIp = clientIp(request);
    response.setHeader("x-request-id", requestId);

    // Request-scoped logger: business/security events inherit request_id + ip.
    request.log = (level, message, details = {}) =>
      log(level, message, { request_id: requestId, ip: request.clientIp, ...details });

    response.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const route = routeLabel(request);
      const status = response.statusCode;
      const bytesOut = Number(response.getHeader("content-length")) || 0;
      const bytesIn = Number(request.headers["content-length"]) || 0;

      httpRequests.inc({ route, method: request.method, status });
      httpDuration.observe({ route, method: request.method }, durationMs / 1000);
      httpResponseBytes.observe({ route }, bytesOut);

      log("info", "http_access", {
        method: request.method,
        route,
        status,
        duration_ms: Math.round(durationMs),
        bytes_in: bytesIn,
        bytes_out: bytesOut,
        ip: request.clientIp,
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
