import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test_secret";
process.env.DB_PASSWORD = "x";
process.env.PSP_WEBHOOK_SECRET = "test_webhook";

const { resolveTitle, resolveNextTitle } = await import("../src/titles.js");

const titles = [
  { label: "Soutien", thresholdCents: 0 },
  { label: "Donateur", thresholdCents: 5000 },
  { label: "Grand donateur", thresholdCents: 20000 },
];

test("resolveTitle returns the highest reached tier", () => {
  assert.equal(resolveTitle(0, titles), "Soutien");
  assert.equal(resolveTitle(4999, titles), "Soutien");
  assert.equal(resolveTitle(5000, titles), "Donateur");
  assert.equal(resolveTitle(25000, titles), "Grand donateur");
});

test("resolveTitle returns null when no tier is reached", () => {
  assert.equal(resolveTitle(0, [{ label: "Donateur", thresholdCents: 5000 }]), null);
});

test("resolveNextTitle reports the remaining amount", () => {
  assert.deepEqual(resolveNextTitle(0, titles), {
    label: "Donateur",
    thresholdCents: 5000,
    remainingCents: 5000,
  });
  assert.equal(resolveNextTitle(20000, titles), null);
});
