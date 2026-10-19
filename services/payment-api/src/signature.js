import crypto from "node:crypto";

export function computeSignature(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function isValidSignature(received, expected) {
  if (typeof received !== "string" || received.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
