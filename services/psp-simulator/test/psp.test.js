import { after, before, test } from "node:test";
import assert from "node:assert/strict";

process.env.PSP_WEBHOOK_SECRET = "test_webhook";
process.env.PAYMENT_API_URL = "http://payment.invalid";
process.env.PUBLIC_URL = "http://127.0.0.1:3003";

const { application } = await import("../src/application.js");

const httpClient = globalThis.fetch;
let server;
let baseUrl;

before(async () => {
  server = await new Promise((resolve) => {
    const instance = application.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function createSession() {
  const response = await httpClient(`${baseUrl}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reference: "don_test",
      amountCents: 2500,
      currency: "EUR",
      returnUrl: "http://localhost:5173/thanks",
    }),
  });
  return response.json();
}

test("health responds", async () => {
  const response = await httpClient(`${baseUrl}/health`);
  assert.equal(response.status, 200);
});

test("creates a valid session", async () => {
  const response = await httpClient(`${baseUrl}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reference: "don_x", amountCents: 1000 }),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.match(body.sessionId, /^sess_/);
  assert.ok(body.checkoutUrl.includes(body.sessionId));
});

test("rejects an invalid session", async () => {
  const response = await httpClient(`${baseUrl}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reference: "don_x" }),
  });
  assert.equal(response.status, 400);
});

test("returns 404 for an unknown checkout page", async () => {
  const response = await httpClient(`${baseUrl}/checkout/sess_unknown`);
  assert.equal(response.status, 404);
});

test("renders the checkout page with the amount", async () => {
  const { sessionId } = await createSession();
  const response = await httpClient(`${baseUrl}/checkout/${sessionId}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Simulated payment/);
  assert.match(html, /25\.00 EUR/);
});

test("confirming triggers a signed webhook", async (t) => {
  const { sessionId } = await createSession();
  let call = null;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    call = { url, options };
    return new Response("{}", { status: 200 });
  });
  const response = await httpClient(`${baseUrl}/checkout/${sessionId}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "pay" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "paid");
  assert.ok(call.url.endsWith("/api/donations/webhook"));
  assert.ok(call.options.headers["x-signature-psp"]);
});

test("confirming with a failure decision", async (t) => {
  const { sessionId } = await createSession();
  t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 200 }));
  const response = await httpClient(`${baseUrl}/checkout/${sessionId}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "fail" }),
  });
  const body = await response.json();
  assert.equal(body.status, "failed");
});
