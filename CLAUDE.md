# CLAUDE.md

Basic build instructions for this repository:

## Mission

Build a simple and secure donation platform for **Octobre Rose**, plus a companion AI module that pentests the platform in a controlled way.

## Product Requirements (MVP)

1. Accept one-time donations with a simple checkout flow.
2. Keep donor data minimal (email + amount + payment status).
3. Use payment provider **sandbox/test mode** only in development.
4. Add audit-friendly logs for checkout creation and payment confirmation.

## Security Requirements

1. Never commit secrets (API keys, tokens, private credentials).
2. Validate and sanitize all user inputs.
3. Add basic rate limiting and abuse protections before exposing endpoints publicly.
4. Keep pentest execution limited to local/staging infrastructure owned by the project.

## AI Pentest Module Rules

1. Focus on web-app risks: auth bypass, input validation failures, injection, SSRF, CSRF, IDOR, rate-limit bypass.
2. Produce reproducible test cases with request examples and expected outcomes.
3. Report severity and remediation guidance for each finding.
4. Do not run destructive tests against production systems.
