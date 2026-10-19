import { after, before, test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test_secret";
process.env.DB_PASSWORD = "x";
process.env.PSP_WEBHOOK_SECRET = "test_webhook";
process.env.PSP_URL = "http://psp.invalid";

const { application } = await import("../src/application.js");
const { pool } = await import("../src/db.js");
const { computeSignature } = await import("../src/signature.js");

const httpClient = globalThis.fetch;
let server;
let baseUrl;

before(async () => {
  server = await new Promise((resolve) => {
    const instance = application.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await pool.end().catch(() => {});
});

function postJson(path, body, headers = {}) {
  return httpClient(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("checkout rejects an invalid amount", async () => {
  const response = await postJson("/api/donations/checkout", {
    amount: 10,
    email: "donor@example.org",
  });
  assert.equal(response.status, 400);
});

test("checkout requires an email for an anonymous donation", async () => {
  const response = await postJson("/api/donations/checkout", { amount: 2500 });
  assert.equal(response.status, 400);
});

test("checkout creates a session and returns a reference", async (t) => {
  t.mock.method(pool, "execute", async () => [{ insertId: 1 }]);
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ checkoutUrl: "http://psp/checkout/sess_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
  );
  const response = await postJson("/api/donations/checkout", {
    amount: 2500,
    email: "donor@example.org",
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.match(body.reference, /^don_/);
  assert.equal(body.paymentUrl, "http://psp/checkout/sess_1");
});

test("leaderboard ranks donors with their title", async (t) => {
  t.mock.method(pool, "execute", async (sql) => {
    if (sql.includes("FROM transactions t")) {
      return [
        [
          { displayName: "Alice", totalCents: 30000, donationCount: 3 },
          { displayName: "Bob", totalCents: 6000, donationCount: 1 },
        ],
      ];
    }
    if (sql.includes("FROM titles")) {
      return [
        [
          { label: "Soutien", thresholdCents: 0 },
          { label: "Donateur", thresholdCents: 5000 },
          { label: "Grand donateur", thresholdCents: 20000 },
        ],
      ];
    }
    return [[]];
  });
  const response = await httpClient(`${baseUrl}/api/donations/leaderboard`);
  assert.equal(response.status, 200);
  const { leaderboard } = await response.json();
  assert.equal(leaderboard[0].displayName, "Alice");
  assert.equal(leaderboard[0].rank, 1);
  assert.equal(leaderboard[0].title, "Grand donateur");
  assert.equal(leaderboard[1].title, "Donateur");
});

test("webhook rejects an invalid signature", async () => {
  const response = await postJson(
    "/api/donations/webhook",
    { reference: "don_1", status: "paid" },
    { "x-signature-psp": "wrong" }
  );
  assert.equal(response.status, 401);
});

test("webhook accepts a valid signature and updates the transaction", async (t) => {
  let seenSql = null;
  t.mock.method(pool, "execute", async (sql) => {
    seenSql = sql;
    return [{ affectedRows: 1 }];
  });
  const body = JSON.stringify({
    reference: "don_1",
    pspReference: "sess_1",
    status: "paid",
  });
  const signature = computeSignature("test_webhook", Buffer.from(body));
  const response = await httpClient(`${baseUrl}/api/donations/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature-psp": signature },
    body,
  });
  assert.equal(response.status, 200);
  assert.match(seenSql, /UPDATE transactions/);
});
