# Agent 04 — Verify Windows alert delivery

**What to verify** Enable Windows alerts from Orbit Settings. Confirm that a Calendar alert appears on this PC and opens the intended entry.

**Blocked by** A real check of Windows registration and banner delivery. The previous local tool policy blocked the Start Menu registration smoke test.

**Status** Alert events implemented · native delivery pending

## Acceptance criteria

- [ ] **Enable Windows alerts** registers the Orbit shortcut and a test alert appears.
- [ ] A prepared Calendar entry produces one due alert. Opening it for handoff and recording a verified publication produce the appropriate alerts.
- [ ] A tab-load failure is reported as needing attention. Clicking a Calendar alert opens the correct entry.
- [ ] Orbit starts on demand from its Windows shortcut.

[Local setup](../../../README.md) · [Accepted alert behavior](../../../docs/adr/0010-agent-led-publishing.md)
