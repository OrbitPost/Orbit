# 05 — Plan a prepared draft on the Bangkok Calendar

**What to build** Create a draft and put prepared entries for specific destinations on the separate Calendar.

**Blocked by** [02 — Reopen two separate saved account sessions](02-reopen-two-separate-saved-account-sessions.md)

**Status** Complete

## Acceptance criteria

- [x] A draft can share copy across destinations and use destination-specific wording.
- [x] The sidebar’s separate **Calendar** tab shows month and week views in Bangkok time. Entries show the exact saved account, destination, time, and whether the post is automatic or a prepared draft.
- [x] Editing the source draft preserves existing captured entries.

## Verification

Verify planning and frozen text with SQLite and a fake account. On a non-Bangkok host, confirm an entry just after Bangkok midnight appears on the correct day.

## Audit evidence

SQLite tests cover Bangkok-to-UTC conversion and frozen copy across destinations. The Electron fixture saved a prepared job with its selected account, destination, and media. The Calendar exposes month and week views.

## References

[Scheduling and destinations](../../../docs/adr/0002-schedule-posts-for-explicit-destinations.md) · [Shared drafts and publishing](../../../docs/adr/0003-share-drafts-and-publish-by-destination.md) · [Chart and calendar library research](../../../docs/research/2026-11-19-orbit-chart-and-calendar-libraries.md)
