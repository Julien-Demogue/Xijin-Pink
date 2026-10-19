# API Documentation

Each service serves its own OpenAPI 3 spec and an interactive Swagger UI:

| Service       | Swagger UI                   | Raw spec                        |
| ------------- | ---------------------------- | ------------------------------- |
| auth-service  | http://localhost:3001/api-docs | http://localhost:3001/openapi.json |
| payment-api   | http://localhost:3002/api-docs | http://localhost:3002/openapi.json |
| psp-simulator | http://localhost:3003/api-docs | http://localhost:3003/openapi.json |

The spec is the source of truth in each service's `src/openapi.js`; keep it in
sync with the implementation. The archive ships these specs as part of the code.

Main business endpoints:
- `POST /api/auth/register`, `POST /api/auth/login`, `GET|PUT /api/auth/profile`
- `POST /api/donations/checkout`, `POST /api/donations/webhook`
- `GET /api/donations/history`, `GET /api/donations/summary`, `GET /api/donations/leaderboard`

See [../payment-flow.md](../payment-flow.md).
