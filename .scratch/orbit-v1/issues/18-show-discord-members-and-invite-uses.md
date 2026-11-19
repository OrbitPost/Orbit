# 18 — Show Discord members and invite uses

**What to build** Show the Discord member count and the owner’s invite usage on Home and in the weekly report. Discord is a reporting source.

**Blocked by** [13 — Update Home when a report is saved](13-update-home-when-a-report-is-saved.md)

**Status** Complete

## Acceptance criteria

- [x] Home and the saved weekly report show the Discord member count and **Your invite uses**, with the invite coverage and verification date.
- [x] Changes in coverage are distinguishable from metric changes for comparable scopes.

## Verification

Run active-invite and stale fixtures. Compare an authorized live reading to the displayed coverage when access is available.

## Audit evidence

Discord fixtures distinguish exact historical membership from the API estimate and sum only the intended inviter’s active links. Home and Analytics retain the coverage and verification date. A live bot reading can be checked once configured.

## References

[On-demand report behavior](../../../docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Verified metric history](../../../docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md) · [Product requirements](../../../PRODUCT.md)
