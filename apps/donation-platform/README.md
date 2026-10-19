# Donation Platform (MVP)

This folder is reserved for the donation application implementation.

## Suggested Minimal Components

- `frontend/`: simple donation page (amount + email + donate button)
- `backend/`: API for checkout session + payment confirmation

## Minimal API Contract

- `POST /api/donations/checkout`
  - Input: `{ "email": "donor@example.com", "amount": 2000, "currency": "EUR" }`
  - Output: `{ "checkoutUrl": "https://..." }`
- `POST /api/donations/webhook`
  - Payment-provider webhook endpoint (sandbox/test mode)
