# RAG Operator Assistant

Local assistant for operators facing an incident. Ollama + LangChain, model ≤ 8B
parameters (a smaller model is fine if justified by the hardware/use).

Retrieves from team docs — architecture, `docs/runbooks/`, procedures — to help
understand what is happening or consult a procedure.

Boundaries:
- **read-only** over docs; no privileged system access;
- not the remediation automaton (that is `services/remediation-engine`);
- may run on the optional PC IA, exposed only as an API on the group hotspot.
