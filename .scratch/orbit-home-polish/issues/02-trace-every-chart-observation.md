# 02 — Trace every chart observation to a saved report

**What to build** Read verified totals and dates, see breaks between incomparable observations, and open the same saved report from a point or its keyboard action.

**Blocked by** [01 — Give engagement totals and history the lead](01-refine-the-home-layout.md)

**Status** complete

- [x] The chart displays exact values on a proportional date axis. Equal known windows and matching scopes may connect. Incomparable observations stay visible with no connecting segment or change badge.
- [x] Same-scope point-in-time counts compare across different dates. A carried-forward value retains its check date and adds no point.
- [x] Every observation exposes its metric, exact total and window or check date. All plotted reports are reachable by keyboard, including older reports.
- [x] Saving a report refreshes Home. The platform breakdown shows saved scope and invite coverage, including explicit zeros.

Verified with metric-history tests, a fixture report refresh, pointer and keyboard report actions, and a nine-observation history in Electron.

[Parent spec](../../../SPEC-home-polish.md) · [Verified metric history](../../../docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md)
