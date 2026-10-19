import { config } from "./config.js";

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

export function escapeHtml(value) {
  const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (character) => table[character]);
}
