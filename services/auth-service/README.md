# Auth Service

Authentication / session management for the platform (Node.js). One of the four
required business microservices (DB, business API, auth, frontend).

Keep token/secret material in Vault or SOPS — never committed. Emit structured
auth events to Loki for the SIEM.
