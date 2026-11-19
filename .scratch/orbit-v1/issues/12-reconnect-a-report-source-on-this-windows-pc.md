# 12 — Reconnect a report source on this Windows PC

**What to build** Use Reconnect or Copy link to resume one pending source check while others continue.

**Blocked by** [11 — Save an on-demand weekly report](11-save-an-on-demand-weekly-report.md)

**Status** Local checks passed · live identity check pending

## Acceptance criteria

- [x] When a source needs sign-in, Orbit keeps checking other sources and shows **Reconnect** and **Copy link**. The prompt falls back to the last verified figure and date after five minutes without action.
- [x] The first accepted action starts the second five-minute sign-in window. Repeated actions preserve the deadline.
- [ ] A same-PC link opens the intended account. Wrong-account sign-in and expired links preserve the original figure and scope.

## Verification

Run the approved spec's fake-clock and clipboard fixtures. Check the link in a Windows dev profile and repeat against the installed app at packaging.

## Audit evidence

The Windows fixture opened the intended account from a copied link and rejected a mismatched identity entry. Fake-clock tests cover both deadlines, clipboard failure, and a refresh continuing beyond the sign-in deadline. Live identity currently relies on owner confirmation. OS protocol registration still needs an installed-app check.

## References

[Approved reconnect spec](../../../SPEC-report-reconnect.md) · [Saved account sessions](../../../docs/adr/0006-use-account-sessions-and-workspace-wide-chat.md)
