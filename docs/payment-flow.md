# Payment Flow (simulated)

All payment processing is handled by an **in-cluster simulated PSP**
(`services/psp-simulator`). There is no external provider and no Internet
dependency during the demo — important for a single-take Clip Chrono and a live
finale over Microsoft Teams. The checkout + signed-webhook shape is kept so the
design stays realistic.

## Nominal flow

1. Donor submits email + amount on the donation page (`services/frontend`).
2. Frontend calls `POST /api/donations/checkout` on `services/payment-api`
   (through the WAF).
3. `payment-api` validates the payload, records the donation as `pending`, and
   creates a checkout session on `services/psp-simulator`.
4. Donor is redirected to the PSP simulator's checkout page and confirms.
5. The PSP simulator calls `POST /api/donations/webhook` on `payment-api` with an
   **HMAC-signed** payload.
6. `payment-api` verifies the signature and marks the donation `paid` / `failed`.
7. Each step emits a structured JSON audit log to Loki (checkout created, webhook
   received, status updated).

## Data kept (minimal, fictional)

- donor email
- amount + currency
- payment status (`pending` / `paid` / `failed`)
- transaction id + timestamps

## Recovery verification

The end-to-end check in `tests/` replays this flow after remediation: a new
fictional transaction must reach `paid`. That success — not a container
restart — is the proof the service is usable again.

## Secrets

The webhook HMAC key and DB credentials come from Vault/SOPS, never committed.
See [architecture.md](architecture.md) for the exposure matrix (the PSP simulator
and webhook endpoint are internal; only the frontend and dashboard are reachable
on the hotspot, via the WAF).
