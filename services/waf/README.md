# WAF

Sole ingress to the platform on the hotspot. Reverse-proxies the `frontend` and
`dashboard`; everything else stays internal.

Responsibilities:
- Application filtering (OWASP CRS — Nginx + ModSecurity, or a Node gateway).
- **Rate limiting** and abuse protection (the project's only place for it).
- Access logs shipped to Loki for the SIEM/SOC.

Must not proxy: database, PSP simulator, webhook endpoint, Prometheus/Loki,
Vault, or the Docker API.
