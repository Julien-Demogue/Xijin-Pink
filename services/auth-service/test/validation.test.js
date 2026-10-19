import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test_secret";
process.env.DB_PASSWORD = "x";

const { isValidEmail, isNonEmptyString } = await import("../src/utils.js");

test("isValidEmail accepts a well-formed address", () => {
  assert.equal(isValidEmail("alice@example.org"), true);
});

test("isValidEmail rejects malformed values", () => {
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail(42), false);
});

test("isNonEmptyString enforces content and length", () => {
  assert.equal(isNonEmptyString("Alice", 80), true);
  assert.equal(isNonEmptyString("   ", 80), false);
  assert.equal(isNonEmptyString("x".repeat(81), 80), false);
});
