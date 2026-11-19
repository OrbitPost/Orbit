# 21 — Schedule or run a report from chat

**What to build** Use chat from any tab to prepare a draft, plan or reschedule a post, or request a weekly report.

**Blocked by** [04 — Save reusable media in the library](04-save-reusable-media-in-the-library.md), [05 — Plan a prepared draft on the Bangkok Calendar](05-plan-a-prepared-draft-on-the-bangkok-calendar.md), [09 — Recover a missed schedule as Overdue](09-recover-a-missed-schedule-as-overdue.md), [11 — Save an on-demand weekly report](11-save-an-on-demand-weekly-report.md), [20 — Read the requested account scope from chat](20-read-the-requested-account-scope-from-chat.md)

**Status** Complete

## Acceptance criteria

- [x] Chat can read and edit drafts, choose saved media, and look up Calendar items and existing reports through the same workspace commands as the UI.
- [x] Chat resolves the exact draft, account, destination, and Bangkok time before scheduling or rescheduling through the Calendar command.
- [x] A chat-triggered report uses the same report run and appears in Analytics and Home when saved.

## Verification

From a social tab, use fixture tools to read a saved report and select media for a draft, then schedule it, reschedule it, and run a weekly report. Compare their saved results to the UI path and check ambiguous instructions before any dispatch.

## Audit evidence

Fixture Agent turns planned and rescheduled a prepared post and ran the shared report path. An ambiguous schedule was rejected before it reached the Calendar service.

## References

[Shared drafts and publishing](../../../docs/adr/0003-share-drafts-and-publish-by-destination.md) · [On-demand report behavior](../../../docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
