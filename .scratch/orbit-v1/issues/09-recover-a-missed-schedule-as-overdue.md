# 09 — Recover a missed schedule as Overdue

**What to build** Reopen Orbit after a scheduled time passes while the app is closed or suspended.

**Blocked by** [08 — Publish a due post through a fixture integration](08-publish-a-due-post-through-a-fixture-integration.md)

**Status** Complete

## Acceptance criteria

- [x] The missed job appears as **Overdue** and waits for the owner to choose **Publish now** or **Reschedule**.
- [x] The resumed worker processes only jobs that are eligible under their current schedule and recovery state.

## Verification

Advance the fixture clock while the scheduler is unavailable, reopen, and check both actions against the fixture provider.

## Audit evidence

Relaunch moved the missed scheduled job to Overdue. The reschedule command requires a future Bangkok time for an automatic job.

## References

[On-demand runtime](../../../docs/adr/0001-run-on-demand-on-the-local-pc.md) · [Scheduling and destinations](../../../docs/adr/0002-schedule-posts-for-explicit-destinations.md)
