# Infra

Local orchestration of the platform. The resilience stack (WAF, observability,
Ansible, secrets) is described in the sibling folders; this file covers the
runnable dev stack: database, phpMyAdmin, and the three Node.js services.

## Launch (dev)

```bash
cd infra/docker
cp .env.example .env     # adjust local values
docker compose up -d
```

The stack declares `name: xijin-pink` so it stays an isolated Compose project
(the folder is named `infra`, which would otherwise collide with any other
`infra/` project on the machine under the default project name).

Services:

| Service        | URL (dev)               | Role                                 |
| -------------- | ----------------------- | ------------------------------------ |
| phpMyAdmin     | http://localhost:8081   | Inspect the `xijin_pink` database    |
| frontend       | http://localhost:5173   | Frontend                             |
| auth-service   | http://localhost:3001   | Accounts, login, profile             |
| payment-api    | http://localhost:3002   | Donations, history, leaderboard      |
| psp-simulator  | http://localhost:3003   | Simulated payment provider           |
| mariadb        | internal only (3306)    | Database                             |

phpMyAdmin login: server `mariadb`, user/password from `.env` (`DB_USER` /
`DB_PASSWORD`). The MariaDB port is not published — reach the data through
phpMyAdmin. In the
resilience deployment, only the frontend (via the WAF) and the dashboard are
exposed on the hotspot; these dev port mappings are for local work.

## Database

`db/init/01-schema.sql` runs automatically on first start (empty volume).
Tables: `users`, `transactions`, `titles`. The init script runs **only** when the
data volume is empty — if you change `DB_PASSWORD`/`DB_USER` after the first run,
reset the volume with `docker compose down -v` (drops `xijin_pink` data), then
`docker compose up`, otherwise MariaDB keeps the old credentials and rejects the
services with `Access denied`.

## Secrets

`.env` is git-ignored and holds local placeholder secrets only. For the
deliverable, real secrets move to Vault/SOPS (see `secrets/`).
