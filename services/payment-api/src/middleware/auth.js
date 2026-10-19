import jwt from "jsonwebtoken";
import { config } from "../config.js";

function extractToken(request) {
  const header = request.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

export function requireAuth(request, response, next) {
  const token = extractToken(request);
  if (!token) {
    return response.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, config.token.secret);
    request.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return response.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(request, response, next) {
  const token = extractToken(request);
  if (token) {
    try {
      const payload = jwt.verify(token, config.token.secret);
      request.user = { id: payload.sub, email: payload.email };
    } catch {
      request.user = undefined;
    }
  }
  return next();
}
