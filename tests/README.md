# Tests

Includes the **end-to-end recovery check**: after remediation, replay the full
payment flow and assert a new fictional transaction reaches `paid`. That success
is the proof of recovery the jury looks for — not a container restart.

Also hold unit/integration tests for the services and the detection → remediation
contract.
