# Xijin-Pink — PROJECT RESILIENCE-ALPHA

Cyber-resilience demonstrator for the EPSI Bac+5 national workshop. A fictional,
containerized **payment platform** (Octobre Rose donation theme) that absorbs a
controlled security incident and **recovers service automatically**, with no
human repair step. See [CLAUDE.md](CLAUDE.md) for the full brief and
[docs/architecture.md](docs/architecture.md) for the design.

> Lab only. All data is fictional. Offensive actions stay on the team's own
> machines and the `RESILIENCE-G<n>` hotspot (`192.168.137.0/24`). Campus
> networks, other teams, and the Internet are out of scope.

## The resilience chain

```text
fictional transaction  →  incident (from Attacker PC)  →  observability (metrics/logs)
      →  ML anomaly detection  →  remediation decision  →  Ansible playbook
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
│   ├── frontend/                 # Donation page (served behind the WAF)
│   ├── auth-service/             # Authentication
│   ├── payment-api/              # Business API: donations, transactions
│   ├── psp-simulator/            # Simulated payment provider (replaces Stripe)
│   └── remediation-engine/       # Alert → playbook → test transaction (scoped Docker access)
├── dashboard/                    # React + Tailwind supervision UI (before/during/after)
├── ai/
│   ├── anomaly-detection/        # ML over Prometheus metrics + Loki logs
│   └── rag-assistant/            # Ollama + LangChain, read-only over docs/
├── infra/
│   ├── docker-compose.yml        # (to be added) full stack orchestration
│   ├── ansible/                  # Deployment + remediation playbooks
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
| Automation    | Ansible                                             |
| Observability | Prometheus, Grafana, Loki (not Elastic)             |
| Security      | WAF, SIEM/SOC, Vault or SOPS                        |
| AI            | ML anomaly detection; Ollama + LangChain RAG (≤ 8B) |

## Status

Kick-off (Monday): architecture, interfaces and EBIOS risk matrix. No service
code yet — the folders above are placeholders describing intended components.

## Deliverables

`Workshop2026-M2-G<n>-{Dossier.pdf, Pres.pptx, VidChrono.mp4, Code.zip}`. The
archive must contain no plaintext secrets and a deploy/verify README. See
[CLAUDE.md](CLAUDE.md#deliverables).
