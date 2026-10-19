import { config } from "./config.js";

export function asyncHandler(handler) {
  return (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);
}

export function log(level, message, details = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: config.serviceName,
      level,
      message,
      ...details,
    })
  );
}

export function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
