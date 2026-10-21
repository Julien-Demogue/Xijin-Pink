# Architecture

Kick-off design for the PROJECT RESILIENCE-ALPHA demonstrator. This is the
Monday reference the coaches validate (components, flows, exposure, risk matrix).
It will evolve as the build proceeds.

## 1. Goal

Show a critical payment SI that absorbs a controlled security incident and
recovers **automatically** (zero-touch), with the service state made visible
before, during and after. Proof of recovery = a fresh fictional transaction
reaches `paid`, not a container restart.

## 2. Components

### Business SI (Development)

| Service              | Role                                               | Stack         |
| -------------------- | -------------------------------------------------- | ------------- |
| `waf`                | Sole ingress: reverse proxy, WAF rules, rate limit | Node/Nginx+CRS|
| `frontend`           | Donation page                                      | React+Tailwind|
| `auth-service`       | Authentication / sessions                          | Node.js       |
| `payment-api`        | Donations + transactions (business logic)          | Node.js       |
| `psp-simulator`      | Simulated payment provider (checkout + webhook)    | Node.js       |
| `database`           | Persistent donor/transaction store                 | MariaDB       |
| `remediation-engine` | Receives alerts, runs playbooks, verifies recovery | Node.js       |
| `dashboard`          | Supervision: components, events, alerts, recovery  | React+Tailwind|

### Infrastructure

- **Docker Compose** orchestrates every container on the PC Hôte.
- **Ansible** deploys the stack and holds the **remediation playbooks**.
- **Prometheus / Grafana / Loki** for metrics, dashboards and centralized logs.

### AI / Data

- **Anomaly detection** — ML over Prometheus metrics + Loki logs; raises a
  structured alert into the remediation chain. Not hard-coded thresholds.
- **RAG assistant** — Ollama + LangChain (≤ 8B), read-only over `docs/` and
  `docs/runbooks/`. Helps operators understand/consult procedures. It is **not**
  the remediation automaton and holds no privileged access.

### Security

- Hardening of components and accounts.
- **WAF** as the only ingress (rate limiting, filtering).
- **SIEM/SOC** function correlating Loki events + alerts.
- Secrets via **Vault or SOPS**.

## 3. Resilience chain

```text
             ┌────────────── PC Attaquant (redteam/) ──────────────┐
             │   reproducible attack → observable effect           │
             └──────────────────────────┬──────────────────────────┘
                                         ▼
  payment-api / services  ──emit──►  Prometheus (metrics) + Loki (logs)
                                         │
                                         ▼
                             ML anomaly detection  ──alert──►  SIEM/SOC
                                         │
                                         ▼
                          remediation-engine (decision)
                                         │  triggers
                                         ▼
                              Ansible remediation playbook
                                         │
                                         ▼
                   verification: new fictional transaction → paid
                                         │
                                         ▼
                        dashboard shows before / during / after
```

Distinction to keep explicit: **restoring availability** (DoS → service back up)
is not the same as **correcting a compromise or data leak** (injection /
exfiltration → contain + restore integrity). The remediation response differs per
incident type.

## 4. Exposure matrix (hotspot `192.168.137.0/24`)

| Reachable on hotspot        | Internal only (never exposed)                     |
| --------------------------- | ------------------------------------------------- |
| `frontend` (via WAF)        | `database`                                        |
| `dashboard`                 | `psp-simulator`, webhook endpoint                 |
|                             | Prometheus, Grafana backend, Loki                 |
|                             | Vault / secrets                                   |
|                             | Docker API / `remediation-engine` control plane   |

The remediation engine needs elevated rights over containers — restrict it to a
scoped Docker socket proxy (specific actions only), never a general admin API.

## 5. Candidate attack scenarios

Pick at least one that is reproducible, observable, and compatible with an
automatic response you can demonstrate:

- **Controlled DoS** on `payment-api` → latency/error spike → detection →
  restart/scale + rate-limit tightening → transaction succeeds again.
- **Application injection** on an input → WAF/SIEM signal → block + rotate +
  restore → integrity re-verified.
- **Fictional data exfiltration attempt** → anomalous egress/log pattern →
  contain + revoke.

The red-team material lives in `redteam/` and runs **from the Attacker PC only**.

## 6. Risk analysis (EBIOS RM — to complete Monday)

Full analysis under [governance/ebios-rm.md](governance/ebios-rm.md). Starting
points:

- **Critical business value**: ability to process a donation/payment.
- **Feared events**: payment unavailability, fictional-data tampering/leak,
  remediation engine abused as an escalation path.
- **RTO/RPO**: define in [governance/pca-pra.md](governance/pca-pra.md),
  consistent with what the demo actually proves.

## 7. Open decisions

- Database engine and schema: **decided** — MariaDB, with phpMyAdmin for dev
  inspection; tables `utilisateurs`, `transactions`, `titres` (see
  `infra/db/init/`). Shared by `auth-service` and `payment-api` (pragmatic for
  the workshop; a per-service split is the stricter microservice form).
- ML approach (features from metrics vs. logs) and labeling of normal vs. suspect.
- Remediation trigger contract (alert payload schema shared by ML → engine).
- WAF implementation (Nginx + ModSecurity/OWASP CRS, or a Node gateway).

## 8. Consigne Additionnelle 1 — authentification renforcée du back-office

Back-office protégé par une auth à 3 étapes : **identifiant → reconnaissance
faciale → mot de passe**, avec un **ESP8266 à LED bicolore** reflétant l'état.

| Composant | Rôle | Stack |
| --------- | ---- | ----- |
| `services/face-auth` | IA légère reconnaissance faciale + flux d'auth + habilitations ; sert le back-office | Python, OpenCV (YuNet+SFace) |
| `iot/esp8266-led` | Objet connecté : LED rouge/vert selon l'état, en WiFi sur le hotspot | ESP8266, Arduino/PlatformIO |

- La reconnaissance (1:1) confirme que le visage correspond à l'identifiant saisi
  (seuil cosinus 0,363). Échec → identifiant vidé, 1 réessai puis blocage 5 min
  (escalade). Le mot de passe reste délégué à `auth-service`.
- Le service et les gabarits biométriques sont **internes à l'hôte** ; l'ESP8266
  est sur le hotspot. Cadrage RGPD/EBIOS : [governance/biometrie-rgpd.md](governance/biometrie-rgpd.md).
- Écarts assumés (temporaires) : caméra navigateur (pas pilote caméra hôte), IDE
  libre (pas CLion imposé), pas de détection de vivacité.
