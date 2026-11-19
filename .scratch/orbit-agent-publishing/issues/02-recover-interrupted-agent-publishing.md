# Agent 02 — Recover missed and interrupted publishing

**What to build** Give the owner a clear next action when Orbit missed a publish time, a destination needs attention, or a submission may already be live.

**Blocked by** [Agent 01 — Publish one approved Calendar entry](01-publish-approved-post-from-calendar.md)

**Status** Implementation pending

## Acceptance criteria

- [ ] A scheduled automatic entry that comes due while Orbit is closed or suspended appears as **Overdue** on recovery. **Publish now** and **Reschedule** are available for eligible entries.
- [ ] An attempt interrupted after submission begins becomes **Verify publication**. Orbit checks for the intended publication before retrying. An unresolved attempt blocks another send.
- [ ] A matching live post records its URL and publish time. When evidence is incomplete, Calendar and the desktop alert explain which action is needed.
- [ ] Existing published entries and unresolved attempts from the retired provider remain available in Calendar.

## Verification

Use fixtures for a missed time, simultaneous due and manual requests, interruption during submission, and an accepted submission without immediate live confirmation. Verify the saved states across restart.

[Publication recovery decision](../../../docs/adr/0004-preserve-scheduled-content-and-verify-publishing.md)
