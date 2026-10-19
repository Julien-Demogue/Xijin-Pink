# Payment Flow (MVP)

1. Donor submits email + amount on donation page.
2. Frontend calls `POST /api/donations/checkout`.
3. Backend validates payload and creates payment session in sandbox provider.
4. Donor is redirected to checkout URL.
5. Provider calls `POST /api/donations/webhook` on payment completion.
6. Backend verifies webhook signature and marks donation status (`paid` / `failed`).
