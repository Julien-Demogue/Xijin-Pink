import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSignature, isValidSignature } from "../src/signature.js";

test("computeSignature is deterministic and 64 hex characters", () => {
  const a = computeSignature("secret", Buffer.from("body"));
  const b = computeSignature("secret", Buffer.from("body"));
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("isValidSignature accepts a correct signature", () => {
  const signature = computeSignature("secret", Buffer.from("body"));
  assert.equal(isValidSignature(signature, signature), true);
});

test("isValidSignature rejects wrong or mismatched-length signatures", () => {
  const signature = computeSignature("secret", Buffer.from("body"));
  const other = computeSignature("secret", Buffer.from("body2"));
  assert.equal(isValidSignature(other, signature), false);
  assert.equal(isValidSignature("short", signature), false);
});
