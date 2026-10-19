# Payment API

Business API (Node.js): donations and fictional transactions. Validates input,
persists to the database, drives the PSP simulator, verifies signed webhooks.

Endpoints (see [../../docs/api/](../../docs/api/) for OpenAPI):
- `POST /api/donations/checkout` — input `{ email, amount, currency }`, creates a
  `pending` donation and a PSP checkout session, returns `{ checkoutUrl }`.
- `POST /api/donations/webhook` — HMAC-signed callback from the PSP simulator;
  marks the donation `paid` / `failed`.

Emit structured JSON audit logs (checkout created, webhook received, status
updated) to Loki. See [../../docs/payment-flow.md](../../docs/payment-flow.md).
