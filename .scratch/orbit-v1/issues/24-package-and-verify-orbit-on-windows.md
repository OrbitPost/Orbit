# 24 — Package and verify Orbit on Windows

**What to build** Install the finished local app, launch it as needed, and find its data for backup or cleanup.

**Blocked by** [03 — Verify live social sign-in on Windows](03-verify-live-social-sign-in-on-windows.md), [07 — Show a verified publication in the Calendar](07-show-a-verified-publication-in-the-calendar.md), [12 — Reconnect a report source on this Windows PC](12-reconnect-a-report-source-on-this-windows-pc.md), [14 — Collect verified Facebook Page and Group metrics](14-collect-verified-facebook-page-and-group-metrics.md), [15 — Collect verified Reddit metrics](15-collect-verified-reddit-metrics.md), [16 — Collect verified X metrics](16-collect-verified-x-metrics.md), [17 — Collect verified Tumblr metrics](17-collect-verified-tumblr-metrics.md), [18 — Show Discord members and invite uses](18-show-discord-members-and-invite-uses.md), [21 — Schedule or run a report from chat](21-schedule-or-run-a-report-from-chat.md), [22 — Verify a real authorized automatic destination](22-verify-a-real-authorized-automatic-destination.md), [23 — Apply the agreed launch and workspace design](23-apply-the-agreed-launch-and-workspace-design.md)

**Status** Package built · blocked by Application Control

## Acceptance criteria

- [ ] Windows starts with Orbit closed. After launching it, local workspace data and still-valid saved sessions are available across app and Windows restarts.
- [ ] The copied reconnect link resolves in the installation. Installer and removal instructions identify Orbit's local data directory and the effect of removing it.
- [ ] End-to-end checks cover accounts, Calendar and publishing recovery, the weekly report, and the Agent panel.

## Verification

Run the full verification suite, installer smoke, and a disposable-profile restart. Check startup and saved sessions after an owner-initiated Windows restart. Record live provider checks independently from fixtures.

## Audit evidence

The portable bundle built successfully. Windows Application Control blocked launching Orbit.exe. The local Electron launcher passed disposable-profile restart checks. Installed protocol registration, an owner-initiated Windows restart, and live account/provider checks remain open.

## References

[Accepted stack and development workflow](../../../docs/adr/0009-select-orbit-desktop-development-stack.md) · [On-demand runtime](../../../docs/adr/0001-run-on-demand-on-the-local-pc.md) · [Approved reconnect spec](../../../SPEC-report-reconnect.md)
