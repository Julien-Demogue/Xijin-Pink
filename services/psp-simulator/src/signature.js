import crypto from "node:crypto";

export function computeSignature(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}
