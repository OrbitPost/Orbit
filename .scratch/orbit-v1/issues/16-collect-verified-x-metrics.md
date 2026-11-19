# 16 — Collect verified X metrics

**What to build** Run the on-demand report with permitted X activity from a saved source.

**Blocked by** [11 — Save an on-demand weekly report](11-save-an-on-demand-weekly-report.md)

**Status** Local capture ready · authorized source needed

## Acceptance criteria

- [x] Keep post views, reply views, and any provider-specific impression figures in distinct comparable scopes.
- [x] Keep the source, date, and scope for each reading. Show the applicable carried-forward or unavailable state when the source cannot verify a figure.

## Verification

Verify one eligible live reading for X and compare the evidence and saved source scope. Simulate a missing metric with a source fixture.

## Audit evidence

Post views, reply views, and provider series retain separate keys and measured windows. Verify each supported scope with the owner’s authorized X account or provider.

## References

[On-demand report behavior](../../../docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Verified metric history](../../../docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md)
