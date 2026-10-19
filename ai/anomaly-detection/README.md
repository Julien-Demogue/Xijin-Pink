# Anomaly Detection (ML)

Machine-learning detector over Prometheus metrics and/or Loki logs. Distinguishes
normal behavior from a suspect one and raises a structured alert into the
remediation chain. **Not** hard-coded thresholds.

To document (technical dossier): data used, preparation, model chosen, results,
and observed limits.

Outputs an alert consumed by `services/remediation-engine` — agree the payload
schema with that service.
