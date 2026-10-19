import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function requireAuth(request, response, next) {
  const header = request.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
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
