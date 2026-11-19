# 14 — Collect verified Facebook Page and Group metrics

**What to build** Run the on-demand report with permitted Facebook Page and Group activity from a saved source.

**Blocked by** [11 — Save an on-demand weekly report](11-save-an-on-demand-weekly-report.md)

**Status** Local capture ready · authorized source needed

## Acceptance criteria

- [x] Store Page and Group figures under distinct targets. Preserve the metric scope for attachments and posts the account can verify.
- [x] Keep the source, date, and scope for each reading. Show the applicable carried-forward or unavailable state when the source cannot verify a figure.

## Verification

Verify one eligible live reading for Facebook Page and Group and compare the evidence and saved source scope. Simulate a missing metric with a source fixture.

## Audit evidence

Analytics records separate Page and Group destinations with a saved account, source link, and optional measured window. Verify a live Page and Group reading with the owner’s access.

## References

[On-demand report behavior](../../../docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Product requirements](../../../PRODUCT.md)
