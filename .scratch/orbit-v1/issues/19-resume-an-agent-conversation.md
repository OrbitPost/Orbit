# 19 — Resume an Agent conversation

**What to build** Open the right Agent panel, switch tabs, return to the same conversation, and start a new one when desired.

**Blocked by** [01 — Launch Orbit on demand](01-launch-orbit-on-demand.md)

**Status** Complete

## Acceptance criteria

- [x] The panel starts collapsed. Switching tabs or collapsing it keeps the current conversation.
- [x] **New chat** starts a distinct conversation through the agent provider adapter. Use a fixture provider for this slice.

## Verification

Use a fixture model and reopen the panel across tabs. Verify persistence and New chat after restarting a disposable profile.

## Audit evidence

The Electron fixture used a fake Agent provider. The conversation survived closing and relaunch. New chat switched to a distinct conversation.

## References

[Saved account sessions](../../../docs/adr/0006-use-account-sessions-and-workspace-wide-chat.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
