# PSP Simulator

In-cluster **simulated payment provider**. Replaces any external provider
(e.g. Stripe) so the demo has no Internet dependency and no third-party in the
attack scope.

Provides:
- a checkout page the donor is redirected to,
- an HMAC-signed webhook back to `payment-api` on completion.

Internal only — never exposed on the hotspot. The HMAC key comes from Vault/SOPS.
