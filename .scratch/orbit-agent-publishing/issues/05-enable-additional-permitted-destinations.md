# Agent 05 — Extend publishing to additional permitted destinations

**What to build** Add and verify the remaining approved platform routes using the same Calendar approval, notification, and recovery flow as the first route.

**Blocked by** [Agent 01](01-publish-approved-post-from-calendar.md), [Agent 02](02-recover-interrupted-agent-publishing.md), and authorized access for each destination.

**Status** Platform coverage pending

## Acceptance criteria

- [ ] Record the available publishing mode and supported post types for Facebook, Reddit, X, and Tumblr.
- [ ] Each enabled route verifies the correct saved account and destination, and exercises its supported text and media through the shared publishing flow.
- [ ] X stays on prepared handoff unless an authorized X API route is selected. Other destinations without a permitted write route keep their prepared handoff.
- [ ] Update Calendar and the local setup guide with the actual coverage after each platform rollout.

[Accepted publishing decision](../../../docs/adr/0010-agent-led-publishing.md)
