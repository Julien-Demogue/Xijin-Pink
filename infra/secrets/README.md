# Secrets

All secrets (DB credentials, webhook HMAC key, tokens) are managed with
**HashiCorp Vault or SOPS**. Nothing in plaintext, in this folder or anywhere in
the repo/archive.

- SOPS: commit only the encrypted files; keep keys out of the repo.
- Vault: commit only policies/config; not the secret values.

The deliverable `Code.zip` must contain **no plaintext secret**.
