# 15 — Collect verified Reddit metrics

**What to build** Run the on-demand report with permitted Reddit activity from a saved source.

**Blocked by** [11 — Save an on-demand weekly report](11-save-an-on-demand-weekly-report.md)

**Status** Local capture verified · authorized source needed

## Acceptance criteria

- [x] Keep each account's post results separate. Count a subreddit membership reading once for its verified community scope.
- [x] Keep the source, date, and scope for each reading. Show the applicable carried-forward or unavailable state when the source cannot verify a figure.

## Verification

Verify one eligible live reading for Reddit and compare the evidence and saved source scope. Simulate a missing metric with a source fixture.

## Audit evidence

The workspace fixture keeps two accounts’ post metrics distinct and deduplicates an identical subreddit membership scope. Two real saved identities and an authorized live reading are still needed.

## References

[On-demand report behavior](../../../docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Product requirements](../../../PRODUCT.md)
