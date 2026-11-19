# 01 — Launch Orbit on demand

**What to build** Open a named Orbit window on Windows with a disposable development profile.

**Blocked by** None (can start immediately)

**Status** Complete

## Acceptance criteria

- [x] The dev launcher opens the app and uses a dedicated test data location.
- [x] Closing the last window exits the host. Orbit starts again only when launched.

## Verification

Run the dev command once wired. Open and close a disposable Electron window and check that the host process exits.

## Audit evidence

The built renderer launched in Electron with a dedicated disposable profile. Closing the last window stopped the host. The local launcher starts the same build on demand.

## References

[Accepted stack and development workflow](../../../docs/adr/0009-select-orbit-desktop-development-stack.md) · [On-demand runtime](../../../docs/adr/0001-run-on-demand-on-the-local-pc.md)
