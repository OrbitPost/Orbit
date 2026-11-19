# 02 — Reopen two separate saved account sessions

**What to build** Use the sidebar and account picker to add and reopen two accounts on the same site.

**Blocked by** [01 — Launch Orbit on demand](01-launch-orbit-on-demand.md)

**Status** Complete

## Acceptance criteria

- [x] Two accounts keep separate site data across app exit and reopen.
- [x] Views of the same saved account share its session. Selecting a sidebar tab opens that account’s site in the main pane.
- [x] New Tab lists saved accounts and offers **+ Add account** for Facebook, Reddit, X, and Tumblr.

## Verification

With a local same-origin fixture, confirm different saved accounts retain separate cookies and site storage across an Orbit restart. Open New Tab, check its saved accounts and **+ Add account**, then open a second tab for one account and verify it sees the same session. Task 03 covers owner-assisted live sign-in.

## Audit evidence

Two persistent fixture cookie partitions were distinct across Electron relaunch. Extra tabs share the saved account partition. Live identities are tracked in ticket 03.

## References

[Saved account sessions](../../../docs/adr/0006-use-account-sessions-and-workspace-wide-chat.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
