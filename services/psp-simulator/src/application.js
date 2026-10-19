import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { config } from "./config.js";
import { computeSignature } from "./signature.js";
import { openApiSpec } from "./openapi.js";
import { escapeHtml, log } from "./utils.js";

const sessions = new Map();

async function notifyPaymentApi(session, status) {
  const body = JSON.stringify({
    reference: session.reference,
    pspReference: session.id,
    status,
    amountCents: session.amountCents,
  });
  const signature = computeSignature(config.webhookSecret, body);
  await fetch(`${config.paymentApiUrl}/api/donations/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature-psp": signature },
    body,
  });
}

function checkoutPage(session) {
  const amount = (session.amountCents / 100).toFixed(2);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Simulated payment — Xijin Pink</title>
</head>
<body>
  <h1>Simulated payment</h1>
  <p>Donation of ${amount} ${escapeHtml(session.currency)} — reference ${escapeHtml(session.reference)}</p>
  <button type="button" onclick="confirm('pay')">Confirm payment</button>
  <button type="button" onclick="confirm('fail')">Simulate a failure</button>
  <script>
    async function confirm(decision) {
      const response = await fetch(location.pathname + '/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      const data = await response.json();
      document.body.innerHTML =
        '<h1>Status: ' + data.status + '</h1>' +
        '<p><a href="' + data.returnUrl + '">Back to the platform</a></p>';
    }
  </script>
</body>
</html>`;
}

export const application = express();
application.use(helmet({ contentSecurityPolicy: false }));
application.use(express.json({ limit: "16kb" }));

application.get("/health", (request, response) => response.json({ status: "ok" }));
application.get("/openapi.json", (request, response) => response.json(openApiSpec));

application.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec)
);

application.post("/sessions", (request, response) => {
  const { reference, amountCents, currency, returnUrl } = request.body ?? {};
  if (typeof reference !== "string" || !Number.isInteger(amountCents)) {
    return response.status(400).json({ error: "Invalid session parameters" });
  }
  const id = `sess_${crypto.randomUUID()}`;
  sessions.set(id, {
    id,
    reference,
    amountCents,
    currency: currency ?? "EUR",
    returnUrl: returnUrl ?? config.defaultReturnUrl,
    status: "pending",
  });
  log("info", "session_created", { id, reference });
  return response.status(201).json({
    sessionId: id,
    checkoutUrl: `${config.publicUrl}/checkout/${id}`,
  });
});

application.get("/checkout/:id", (request, response) => {
  const session = sessions.get(request.params.id);
  if (!session) {
    return response.status(404).send("Payment session not found");
  }
  return response.type("html").send(checkoutPage(session));
});

application.post("/checkout/:id/confirm", async (request, response) => {
  const session = sessions.get(request.params.id);
  if (!session) {
    return response.status(404).json({ error: "Session not found" });
  }
  const status = request.body?.decision === "fail" ? "failed" : "paid";
  session.status = status;
  await notifyPaymentApi(session, status);
  log("info", "payment_confirmed", { id: session.id, status });
  return response.json({ status, returnUrl: session.returnUrl });
});
