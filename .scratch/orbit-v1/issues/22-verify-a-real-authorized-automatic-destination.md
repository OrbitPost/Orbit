# 22 — Verify a real authorized automatic destination

**What to build** Connect an authorized destination and confirm one approved automatic publishing result.

**Blocked by** [Agent 01 — Publish one approved Calendar entry](../../orbit-agent-publishing/issues/01-publish-approved-post-from-calendar.md) and [Agent 02 — Recover missed and interrupted publishing](../../orbit-agent-publishing/issues/02-recover-interrupted-agent-publishing.md)

**Status** Needs first Agent route, live authorization, and test-post approval

## Acceptance criteria

- [ ] The supported integration publishes to the intended destination and Orbit records the verified live link and time.
- [ ] Check the publishing mode for Facebook, Reddit, X, and Tumblr. Destinations with a verified authorized integration can publish automatically. Other destinations offer prepared drafts.

## Verification

Use the provider fixture first. Run an owner-authorized live test with a selected destination and inspect the provider and Calendar records. Record which destinations and media formats each enabled integration has verified.

## Audit evidence

The retired provider fixture verified an intended destination and a single submission. Use a permitted Agent publishing route for the live check. The owner needs to approve the exact account, destination, and test post before submission.

## References

[Scheduling and destinations](../../../docs/adr/0002-schedule-posts-for-explicit-destinations.md) · [Captured content and publication verification](../../../docs/adr/0004-preserve-scheduled-content-and-verify-publishing.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
