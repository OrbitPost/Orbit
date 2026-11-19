# 13 — Update Home when a report is saved

**What to build** See the latest numeric totals and comparable history on Home.

**Blocked by** [11 — Save an on-demand weekly report](11-save-an-on-demand-weekly-report.md)

**Status** Complete

## Acceptance criteria

- [x] Home starts with Facebook Page views, X post views, Reddit members, and Discord members as its default headline metrics when available. The owner can pin or swap up to four metrics. The platform breakdown is available below.
- [x] Clicking a headline metric or using the dropdown changes the single history chart. Verified period totals have individual points and date ranges, with a line break between consecutive points with incomparable windows. A carried-forward value adds no new chart point. Each point and its keyboard-accessible report link open the same saved report.
- [x] Each available total shows its source date or reporting window. Unequal or unknown windows suppress the change badge for period totals. Same-scope point-in-time counts can compare across dates. **Next up** shows the next scheduled post and overdue count, and links to Calendar.

## Verification

Save fresh and carried-forward fixtures in succession. Verify pinning, swapping, and chart selection from a headline metric and the dropdown. Check source dates, chart spacing, and keyboard access. Compare a ten-day views total to a four-day total. Verify both points and date ranges are visible, the connecting line and change badge are absent, and either point opens its own report. Verify a same-scope member count change and the compact **Next up** summary.

## Audit evidence

The Home polish implementation verified pinned totals, selection, chart gaps and dated points, carry-forward handling, keyboard report links, and compact Next up.

## References

[Verified metric history](../../../docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md) · [Chart and calendar library research](../../../docs/research/2026-11-19-orbit-chart-and-calendar-libraries.md)
