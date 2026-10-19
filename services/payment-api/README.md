# Payment API

Business API (Node.js, port 3002): donations, fictional transactions, history,
leaderboard and donor titles. Validates input, persists to the shared MariaDB
database, drives the PSP simulator, verifies signed webhooks. Emits structured
JSON audit logs (checkout created, webhook received, status updated) to stdout
(shipped to Loki in the resilience deployment).

## Endpoints

- `POST /api/donations/checkout` — `{ amount, currency?, email? }` (`amount` in
  cents). Auth optional: a bearer token links the donation to the account,
  otherwise `email` is required. Creates a `pending` transaction and a PSP
  session, returns `{ reference, paymentUrl }`.
- `POST /api/donations/webhook` — HMAC-signed (`x-signature-psp`) callback from
  the PSP simulator; marks the transaction `paid` / `failed`. Raw-body route.
- `GET /api/donations/history` — auth required; the caller's transactions.
- `GET /api/donations/summary` — auth required; total given, current title, next title.
- `GET /api/donations/leaderboard` — public leaderboard (sum of paid donations per
  account, ranked) with each donor's title.
- `GET /health` — liveness.
- `GET /api-docs` — Swagger UI (spec at `GET /openapi.json`).

Titles come from the `titles` table, resolved by cumulative paid amount. Add a
tier with a single `INSERT INTO titles (label, threshold_cents) VALUES (...)` —
read at request time, no redeploy.

See [../../docs/payment-flow.md](../../docs/payment-flow.md).

## Tests

`npm test` (Node's built-in runner). Covers the title logic, HMAC signature, and
the HTTP layer (checkout, leaderboard, webhook) with the database and the PSP
call mocked.
