# 07 — Show a verified publication in the Calendar

**What to build** Finish a prepared draft in the authorized account tab and record the verified live result.

**Blocked by** [06 — Capture scheduled media and Drive attachments](06-capture-scheduled-media-and-drive-attachments.md)

**Status** Local checks passed · live check pending

## Acceptance criteria

- [x] A prepared draft opens the correct account and destination and makes its captured caption and media available for the owner to use.
- [x] A verified link and publish time put the post on the Calendar as Published.
- [x] A post created directly on the platform can appear when its live link, time, and destination are verified.

## Verification

Exercise the account-bound handoff with a caption and attachment. Use fixtures for confirmed and unconfirmed links. Exercise a permitted live existing post during the relevant account check.

## Audit evidence

Prepared posts retain a same-platform destination link and captured media. The Electron fixture explicitly confirmed a publication link and time. One permitted live post still needs an owner account check.

## References

[Scheduling and destinations](../../../docs/adr/0002-schedule-posts-for-explicit-destinations.md) · [Captured content and publication verification](../../../docs/adr/0004-preserve-scheduled-content-and-verify-publishing.md)
