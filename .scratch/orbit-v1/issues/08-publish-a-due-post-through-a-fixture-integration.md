# 08 — Publish a due post through a fixture integration

**What to build** Let a connected test integration publish an automatic schedule while Orbit is open.

**Blocked by** [05 — Plan a prepared draft on the Bangkok Calendar](05-plan-a-prepared-draft-on-the-bangkok-calendar.md)

**Status** Complete

## Acceptance criteria

- [x] The scheduler claims one due job and records an attempt before calling the fixture provider.
- [x] A confirmed result updates the Calendar for that destination. A repeated request or simultaneous Publish now sends at most one request for that claim.

## Verification

Use a fake clock and provider. Race the due timer against Publish now and verify the recorded provider calls and final state.

## Audit evidence

In the Electron fixture the running worker claimed and verified one due job through a fake provider. The provider saw exactly one submission. The SQLite suite covers scheduling and claim deduplication.

## References

[Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md) · [Captured content and publication verification](../../../docs/adr/0004-preserve-scheduled-content-and-verify-publishing.md)
