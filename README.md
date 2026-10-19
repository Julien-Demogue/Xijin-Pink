# Xijin-Pink

Initial scaffold for an **Octobre Rose donation platform** with a companion **AI pentest module**.

## Project Structure

```text
.
├── CLAUDE.md
├── apps
│   ├── donation-platform
│   │   └── README.md
│   └── pentest-ai
│       ├── README.md
│       └── system-prompt.md
└── docs
    └── payment-flow.md
```

## Scope (MVP)

- Donation flow with a single one-time payment path
- Minimal backend endpoints for donation checkout and payment confirmation
- Minimal frontend donation page
- AI pentest assistant to run controlled attack scenarios against local/staging environments

## Next Steps

1. Implement the donation API (`POST /api/donations/checkout`).
2. Integrate a payment provider sandbox (e.g. Stripe test mode).
3. Build a simple donation page with amount + donor email.
4. Execute pentest scenarios from `apps/pentest-ai` against non-production targets only.
