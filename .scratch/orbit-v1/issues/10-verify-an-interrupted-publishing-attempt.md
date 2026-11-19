# 10 — Verify an interrupted publishing attempt

**What to build** Recover when the provider may have accepted a post before Orbit received or recorded its response.

**Blocked by** [08 — Publish a due post through a fixture integration](08-publish-a-due-post-through-a-fixture-integration.md)

**Status** Complete

## Acceptance criteria

- [x] The pending attempt is checked before another send can occur.
- [x] A verified match becomes Published. An unresolved outcome shows Verify publication.

## Verification

Simulate acceptance followed by timeout and process exit. Verify the matching and unresolved branches and count dispatches.

## Audit evidence

Workspace recovery preserves Verify publication for an unresolved send. Provider tests verify only the matching result ID and integration before recording a publication.

## References

[Captured content and publication verification](../../../docs/adr/0004-preserve-scheduled-content-and-verify-publishing.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
