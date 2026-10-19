# Observability

- **Prometheus** — metrics from services (latency, errors, resource use).
- **Grafana** — visualization, feeds the supervision dashboard.
- **Loki** — centralized structured logs (audit + security events).
- **Alert rules** — the SIEM/SOC function correlating events and alerts.

This chain must genuinely feed the incident analysis and the ML detector — not be
decorative. Elastic Stack is not used (host memory budget).
