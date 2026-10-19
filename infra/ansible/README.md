# Ansible

Two jobs:
1. **Deploy** the stack reproducibly on the PC Hôte (alongside Docker Compose).
2. Hold the **remediation playbooks** triggered by `services/remediation-engine`.

Be able to explain the split: Compose defines/runs containers; Ansible automates
the operations (deploy + recovery). Keep playbooks idempotent and logged.
