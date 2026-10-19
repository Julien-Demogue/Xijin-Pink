# Tests

## Service tests (unit + HTTP)

Each service ships tests run by Node's built-in runner — no extra dependency:

```bash
cd services/<service> && npm test
```

- `auth-service` — validation helpers; register / login / profile over HTTP, DB mocked.
- `payment-api` — title logic; HMAC signature; checkout / leaderboard / webhook over HTTP, DB and PSP mocked.
- `psp-simulator` — session creation, checkout page, signed-webhook confirmation.

## End-to-end recovery check (to add)

After remediation, replay the full payment flow against the running stack and
assert a new fictional transaction reaches `paid`. That success is the proof of
recovery the jury looks for — not a container restart.
