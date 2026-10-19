# CLAUDE.md

Guidance for AI tools and contributors working in this repository.

## Mission

Build a **cyber-resilience demonstrator**: a fictional, containerized payment
platform (Octobre Rose donation theme) that can take a controlled security
incident and **recover service automatically, with no human repair step**
(zero-touch recovery). The jury must see the service state **before**, **during**
and **after** the incident, and a fresh fictional transaction must succeed once
recovery completes.

This is an EPSI Bac+5 national workshop ("PROJECT RESILIENCE-ALPHA"). The whole
build runs in a self-contained lab. Nothing here targets real users, real money,
or any infrastructure outside the team's own machines.

> A container that restarts is **not** proof of recovery. If the API stays down,
> a business operation still fails, or data is inconsistent, the incident is not
> resolved.

## Five mandatory pillars

All five must be present, even if no team member specializes in them.

1. **Development** — containerized microservices: web frontend, auth service,
   business/payment API, database, a **simulated payment provider (PSP)**, and a
   **remediation engine**. Plus a **React + Tailwind** supervision dashboard.
   Services are **Node.js** (REST or gRPC).
2. **Infrastructure** — **Docker Compose** to orchestrate, **Ansible** for
   deployment and remediation playbooks, observability with **Prometheus**
   (metrics), **Grafana** (visualization), **Loki** (logs). Elastic Stack is
   explicitly not expected.
3. **AI / Data** — a **machine-learning anomaly detector** over metrics/logs
   (not hard-coded thresholds) that feeds the remediation chain; and a **local
   RAG operator assistant** built with **Ollama + LangChain**, model ≤ 8B
   parameters. The assistant is read-only over team docs — it is **not** the
   remediation automaton and must not hold privileged system access.
4. **Cybersecurity** — at least one reproducible attack launched from the
   **Attacker PC**, producing an observable effect; defenses: hardening, a
   **WAF**, a **SIEM/SOC** function, secrets via **Vault or SOPS**. The
   remediation engine may hold elevated rights over containers — keep that
   surface tight and never expose an open admin interface.
5. **Governance / Transformation** — **EBIOS RM** risk analysis, **PCA/PRA**
   with RTO/RPO, **NIS2 & DORA** analysis tied to the architecture (the fictional
   operator is a payment-service provider, so financial-sector framing applies).

## Scope & network (lab only)

- Three roles: **PC Hôte** (runs all services), **PC Attaquant** (launches
  attacks), optional **PC IA** (hosts Ollama only).
- Network is the Windows mobile hotspot `RESILIENCE-G<n>`, `192.168.137.0/24`,
  host at `192.168.137.1`. There is **no public, staging, or production tier**.
- Offensive actions are confined to this lab and the team's own machines. Campus
  networks, other teams, and third-party/Internet services are **out of scope**.
- Expose on the hotspot **only** what the jury needs (frontend via the WAF, the
  dashboard). Never expose the database, Vault/secrets, Prometheus/Loki, or the
  Docker API.

## Security requirements

1. Never commit secrets (API keys, tokens, credentials). Use Vault or SOPS.
2. Validate and sanitize all user input.
3. Rate limiting and abuse protection live at the **WAF**.
4. Use only **fictional** data. No real donor or banking data, ever.
5. Structured JSON audit logs for checkout creation and payment confirmation,
   shipped to Loki and consumable by the SIEM and the ML detector.

## The recovery demo is decisive

In the live jury demo, if the service does not recover automatically and a human
must step in to repair it, the remediation axis scores **0/5**. Design and test
the detection → decision → remediation → verification chain accordingly.

## Deliverables

Grouped in `Workshop2026-M2-G<n>/`, filenames exactly:

- `Workshop2026-M2-G<n>-Dossier.pdf` — engineering & governance report (FR, 8–12 p).
- `Workshop2026-M2-G<n>-Pres.pptx` — short pitch deck (FR).
- `Workshop2026-M2-G<n>-VidChrono.mp4` — ≤ 60 s single-take: attack → anomaly →
  automatic reaction → verified recovery, no cut that could hide a manual action.
- `Workshop2026-M2-G<n>-Code.zip` — repo archive, no plaintext secrets, with a
  README explaining how to deploy and verify.

Repo technical docs (this file, README, architecture) are in English; jury
deliverables under `docs/governance/` are in French.
