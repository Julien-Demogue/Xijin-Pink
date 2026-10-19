# Auth Service

Authentication, accounts and profile (Node.js, port 3001). Issues JWTs used by
`payment-api`. Passwords hashed with bcrypt. Reads/writes the `users` table in
the shared MariaDB database.

## Endpoints

- `POST /api/auth/register` — `{ email, password, displayName }`; creates the
  account, returns `{ token, user }`.
- `POST /api/auth/login` — `{ email, password }`; returns `{ token }`.
- `GET /api/auth/profile` — auth required; the caller's profile.
- `PUT /api/auth/profile` — auth required; update `displayName` and/or `bio`.
- `GET /health` — liveness.
- `GET /api-docs` — Swagger UI (spec at `GET /openapi.json`).

Secrets (`JWT_SECRET`, DB credentials) come from the environment / Vault/SOPS,
never committed. Structured JSON events go to stdout (shipped to Loki in the
resilience deployment).

## Tests

`npm test` (Node's built-in runner). Covers validation helpers and the HTTP
layer (register, login, profile) with the database access mocked.
