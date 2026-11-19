# 03 — Verify live social sign-in on Windows

**What to build** Verify two Reddit logins first, then check Facebook, X, and Tumblr through the same account picker and tabs.

**Blocked by** [02 — Reopen two separate saved account sessions](02-reopen-two-separate-saved-account-sessions.md)

**Status** Four saved accounts · live reopen and Facebook pending

## Acceptance criteria

- [ ] Two real Reddit accounts keep separate identities after closing and reopening Orbit.
- [ ] Record sign-in, identity, and reopen behavior for Facebook, X, and Tumblr separately.

## Verification

Reopen Orbit with the existing saved accounts when the owner is ready. Check each visible identity and keep the two Reddit sessions separate. Check Facebook when the owner adds its account. If Tumblr fails again, confirm Retry in the existing Tumblr session.

## Audit evidence

The owner reported completing sign-in for two Reddit accounts, X, and Tumblr. The local workspace contains four matching saved records. The live identity and relaunch checks remain open. A disposable Electron fixture verified that Retry uses the same Tumblr session.

## References

[Saved account sessions](../../../docs/adr/0006-use-account-sessions-and-workspace-wide-chat.md) · [Accepted stack and development workflow](../../../docs/adr/0009-select-orbit-desktop-development-stack.md)
