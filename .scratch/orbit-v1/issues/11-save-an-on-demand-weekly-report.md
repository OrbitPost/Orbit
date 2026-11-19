# 11 — Save an on-demand weekly report

**What to build** Run a report from Analytics against the last verified baseline.

**Blocked by** [02 — Reopen two separate saved account sessions](02-reopen-two-separate-saved-account-sessions.md)

**Status** Complete

## Acceptance criteria

- [x] The **Run weekly report** button in Analytics starts the report on request.
- [x] The report groups figures by platform and records scoped values, dates, source links, and comparable changes against the prior verified baseline.
- [x] An unavailable source carries its prior date and value when present, and reports unavailable values when no baseline exists.

## Verification

Record the first verified figure, then save a report from Analytics. Exercise refreshed, stale, missing, and differently scoped figures. Compare the saved report and links.

## Audit evidence

The local weekly report retains prior verification dates, includes verified post evidence within its range, and uses the same comparisons in Analytics and Home. Report sections export as Markdown.

## References

[On-demand report behavior](../../../docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Verified metric history](../../../docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md) · [Product requirements](../../../PRODUCT.md)
