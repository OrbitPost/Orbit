# Agent 01 — Publish one approved Calendar entry

**What to build** Let the owner approve an exact Calendar entry for one permitted platform route. Orbit starts the post at the scheduled Bangkok time while it is running and saves the verified result.

**Blocked by** An identified, permitted write route for the first platform. A local fixture can be built before obtaining live account access.

**Status** Implementation pending

## Acceptance criteria

- [ ] Calendar shows which destinations support automatic publishing and which use a prepared handoff. Approval covers the saved account, exact destination, time, caption, and captured media. Changing those details requires renewed approval.
- [ ] The Agent and Calendar use the same scheduling service. The running worker records one attempt before sending. The first implementation supports the post types it can verify for that destination.
- [ ] The publishing action verifies the intended identity and destination. A signed-out session, changed controls, or unsupported content produces an actionable handoff.
- [ ] Orbit sends a desktop alert when a publish attempt starts and when the result is verified or needs attention. A verified result saves the live link and publish time in Calendar.

## Verification

Run a timed end-to-end fixture. Confirm the destination, captured content, one send, alert events, and saved publication evidence. Use V1 22 to verify a real approved post.

[Accepted publishing decision](../../../docs/adr/0010-agent-led-publishing.md) · [Live publishing check](../../orbit-v1/issues/22-verify-a-real-authorized-automatic-destination.md)
