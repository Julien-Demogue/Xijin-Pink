# Xijin-Pink — PROJECT RESILIENCE-ALPHA

Cyber-resilience demonstrator for the EPSI Bac+5 national workshop. A fictional,
containerized **payment platform** (Octobre Rose donation theme) that absorbs a
controlled security incident and **recovers service automatically**, with no
human repair step. See [CLAUDE.md](CLAUDE.md) for the full brief and
[docs/architecture.md](docs/architecture.md) for the design.

> Lab only. All data is fictional. Offensive actions stay on the team's own
> machines and the `RESILIENCE-G<n>` hotspot (`192.168.137.0/24`). Campus
> networks, other teams, and the Internet are out of scope.

## Quick start (one command)

Requires Docker (daemon running); Ollama is optional (for the RAG assistant).

```bash
./scripts/start.sh            # Linux / macOS / Git-Bash
```
```powershell
.\scripts\start.ps1           # Windows PowerShell
```

It generates secrets, builds every image and launches the whole platform. Then:
WAF ingress `:8080`, supervision dashboard `:3000/d/xijin-resilience`, SOC/SIEM
`:3000/d/xijin-soc`, face-auth back-office `:3005`. Check with
`./scripts/verify.sh`, stop with `./scripts/stop.sh`. See
[scripts/README.md](scripts/README.md).

## The resilience chain

```text
fictional transaction  →  incident (from Attacker PC)  →  observability (metrics/logs)
      →  ML anomaly detection  →  remediation decision
      →  service verified usable (a new transaction succeeds)
```

A restart alone is not recovery: the API must answer, a business operation must
succeed, and data must be consistent. The dashboard shows service state before,
during and after.

## Repository structure

```text
.
├── CLAUDE.md                     # Project brief for AI tools / contributors
├── README.md
├── services/                     # Node.js microservices (Docker)
│   ├── waf/                      # Reverse proxy + WAF, rate limiting, sole ingress
│   ├── auth-service/             # Authentication
│   ├── payment-api/              # Business API: donations, transactions
│   ├── psp-simulator/            # Simulated payment provider (replaces Stripe)
│   └── remediation-engine/       # Alert → playbook → test transaction (scoped Docker access)
├── frontend/                     # Donation page (React+Tailwind, served behind the WAF)
├── dashboard/                    # React + Tailwind supervision UI (before/during/after)
├── ai/
│   ├── anomaly-detection/        # ML over Prometheus metrics + Loki logs
│   └── rag-assistant/            # Ollama + LangChain, read-only over docs/
├── infra/
│   ├── docker/                   # MariaDB, phpMyAdmin + the others services
│   ├── db/init/                  # SQL schema (utilisateurs, transactions, titres)
│   ├── observability/            # Prometheus, Grafana, Loki, alert rules (SOC)
│   └── secrets/                  # SOPS-encrypted files or Vault policies
├── redteam/                      # Attack scripts run from the Attacker PC
├── tests/                        # Incl. end-to-end "fictional transaction" check
└── docs/
    ├── architecture.md           # Components, flows, exposure matrix
    ├── payment-flow.md           # Checkout + signed webhook (internal PSP)
    ├── api/                      # OpenAPI specs
    ├── governance/               # EBIOS RM, PCA/PRA, NIS2/DORA (FR, jury)
    └── runbooks/                 # Operator procedures (indexed by the RAG assistant)
```

## Tech constraints

| Area          | Choice                                              |
| ------------- | --------------------------------------------------- |
| Services      | Node.js (REST or gRPC)                              |
| Dashboard     | React + Tailwind CSS                                |
| Orchestration | Docker Compose                                      |
| Observability | Prometheus, Grafana, Loki (not Elastic)             |
| Security      | WAF, SIEM/SOC, Vault or SOPS                        |
| AI            | ML anomaly detection; Ollama + LangChain RAG (≤ 8B) |

## Status

Backend implemented: `auth-service`, `payment-api`, `psp-simulator` (Node.js),
MariaDB schema and a Docker Compose dev stack with phpMyAdmin — run it from
[infra/](infra/README.md). Covers accounts/profile, donations, transaction
history, leaderboard and donor titles. `frontend` is wired to these APIs
(see [frontend/README.md](frontend/README.md)). Still to build: dashboard,
observability, WAF, AI detection/RAG, red-team and governance docs.

## Deliverables

`Workshop2026-M2-G2-{Dossier.pdf, Pres.pptx, VidChrono.mp4, Code.zip}`. The
archive must contain no plaintext secrets and a deploy/verify README. See
[CLAUDE.md](CLAUDE.md#deliverables).
