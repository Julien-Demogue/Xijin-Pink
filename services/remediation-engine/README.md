# Remediation Engine

Receives anomaly alerts, decides a response, triggers the matching **Ansible
remediation playbook**, then verifies the service is usable again (a new
fictional transaction must reach `paid`).

This is the automaton — distinct from the RAG assistant. It may hold elevated
rights over containers, so:
- access Docker only through a **scoped socket proxy** (whitelisted actions),
  never a general admin API;
- no open admin interface reachable by other components;
- log every decision and action to Loki.

Input contract: a structured alert from `ai/anomaly-detection` (schema to define
Monday — shared between detector and engine).
