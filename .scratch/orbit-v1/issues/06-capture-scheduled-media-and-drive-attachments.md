# 06 — Capture scheduled media and Drive attachments

**What to build** Attach library media or a Drive file to a planned post.

**Blocked by** [04 — Save reusable media in the library](04-save-reusable-media-in-the-library.md), [05 — Plan a prepared draft on the Bangkok Calendar](05-plan-a-prepared-draft-on-the-bangkok-calendar.md)

**Status** Complete

## Acceptance criteria

- [x] The planned post uses its captured local media after the source library entry changes.
- [x] A selected Drive attachment is copied locally before the entry is committed. A Drive URL in the caption stays part of the caption.

## Verification

Change a media item after planning, then reopen the app. Simulate a failed Drive copy and verify the entry did not queue with missing media.

## Audit evidence

The Drive fixture verifies an authorized capture before the plan can commit. The captured file is linked to its scheduled entry. Shared caption text remains independent.

## References

[Captured content and publication verification](../../../docs/adr/0004-preserve-scheduled-content-and-verify-publishing.md) · [Shared drafts and publishing](../../../docs/adr/0003-share-drafts-and-publish-by-destination.md)
