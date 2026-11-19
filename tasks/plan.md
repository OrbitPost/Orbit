# Orbit V1 implementation plan

**Status** Local implementation verified. The [ticket index](todo.md) tracks the remaining live and installed checks.

## Local implementation evidence

- The local build launches on demand through `Start Orbit.cmd`. The Windows fixture verified separate session persistence, account-bound reconnect links, Calendar recovery, reports, and chat after closing and reopening.
- `npm.cmd run verify` covers type checking, the renderer build, and domain and integration tests for publishing, reporting, media capture, and Agent actions.
- Live account sign-in, real posting, and live analytics require the owner's authorized accounts and connections. The current Agent supports the Responses API key path. The portable package builds successfully and this PC's Application Control policy blocks launching that executable. The verified launch uses the workspace's Electron runtime. See the [local setup guide](../README.md).

Start with a Windows app that opens on demand and can reopen two independent Reddit sessions. Build the Calendar, publishing, reporting, and chat in slices that can each be demonstrated. The [local ticket index](todo.md) records the build order and checkpoints. Each linked ticket carries its own acceptance and verification details.

## Continuing verification

1. Open the [ticket index](todo.md) and pick an open check whose access requirements are available.
2. Use a disposable Windows development profile. The separate saved-session fixture can be completed before the owner-assisted live sign-ins. Continue independent tickets if an account or integration needs the owner.
3. Verify each slice using its listed checks and record evidence in the ticket. Run the local verification suite when the code changes.
4. Use live integrations only when the owner has provided access. Get the owner's explicit approval for a test post before it goes live.

## Sources

- [Product requirements](../PRODUCT.md) and [glossary](../GLOSSARY.md) define the user experience and vocabulary.
- [Accepted desktop stack](../docs/adr/0009-select-orbit-desktop-development-stack.md) defines the tools and proposed development commands. The [local API design](../docs/architecture/orbit-module-and-local-api-design.md) supplies the command contracts and state ownership.
- The [approved report reconnect spec](../SPEC-report-reconnect.md) defines both time windows and the same-PC copied link. The [chart and calendar library research](../docs/research/2026-11-19-orbit-chart-and-calendar-libraries.md) provides the candidate packages and verification fixtures.
- Use this plan as the build order for V1. The [earlier scaffold plan](../docs/superpowers/plans/2026-11-18-social-workspace.md) records the original Postiz integration idea. A supported connection, including an existing authorized Postiz connection, can be evaluated as a publishing adapter.

## Build order

| Work | First demonstrable result | Input it needs |
| --- | --- | --- |
| Windows shell and account tabs | Launch on demand, add two accounts on the same site, and recover separate sessions after reopening. | Electron scaffold and disposable local data. |
| Media and prepared Calendar entries | Save a draft for an exact account and destination, select Bangkok time, and reopen it with its captured media. | Account identity and the local command boundary. Media library entry and prepared scheduling can proceed independently. |
| Automatic publishing and recovery | A fake authorized integration publishes a due post. Missed jobs become Overdue, and an interrupted send goes through verification. | Captured Calendar entries and deterministic time and provider fixtures. |
| Reports, reconnect, and Home | Run a report, retain the dates of carried-forward metrics, reconnect the correct account, and open saved reports from Home. | Account sessions and the owner's report format and baseline fixtures. Home and reconnect can proceed independently after the report save path works. |
| Agent panel | Continue the same conversation across tabs, read the requested scope, and use the Calendar and Analytics commands from chat. | The shell for chat. The relevant account and workspace commands plus the verified tool boundary for live actions. |
| Live integrations and Windows package | An authorized destination passes the real publishing check. The installed app handles reconnect links, repeat launches, and data cleanup. | Provider access for that destination and a working fixture path. Installer verification pulls the proven workflows together. |

## Decisions that shape the plan

- Electron owns account views, the app lifecycle, and local state. Scope the renderer bridge to approved operations. The Calendar and Agent schedule through the same service.
- Keep the database, media, and browser sessions under Orbit's local data ownership, with a separate disposable profile for development. When Orbit closes, its scheduler stops. The app starts on demand.
- Store publish instants in UTC and show them in Asia/Bangkok. Validate a date that crosses midnight in Bangkok on a PC set to another timezone.
- Treat a browser login and a provider publishing authorization as separate capabilities. Show a prepared draft when automatic publishing is unavailable. Preserve per-destination outcomes, and verify an interrupted or ambiguous attempt before dispatching again.
- Use the owner's first saved report as the engagement baseline. Keep source scope and dates in saved reports. Use **Your invite uses** with the recorded invite coverage for Discord.
- Keep the window's side panels subtly frosted, its center screens charcoal, and the Home orbital arc away from the charts. The launch starts with a near-white blur and staggered mark and wordmark. They lift and fade into Home. Respect reduced motion and keep the workspace usable when it is ready.

## Verification

Use `npm.cmd run dev` for a disposable Electron profile, `npm.cmd run dev:web` for the browser fixture preview, and `npm.cmd run verify` for the TypeScript checks, test suite, and build.

Windows sign-in and packaged deep links need live and installed checks. Record real provider verification separately for each source and authorized destination. Disposable sessions and fake provider submissions establish local behavior.

## Risks and checks

| Risk | How the plan resolves it |
| --- | --- |
| A live site handles embedded sign-in differently from the mock. | Test two Reddit accounts early. Then check Facebook, X, and Tumblr separately. Use the observed behavior to identify any release blocker. |
| A real write reaches the provider but Orbit loses the response. | Exercise the materialized attempt record, process interruption, and later verification before connecting the live publisher. |
| A report mixes stale values or incomparable scopes. | Build a fixed report fixture with fresh, carried-forward, unavailable, and noncomparable observations. Compare totals, dates, evidence links, and chart points. |
| A copied link opens the wrong account or starts a second run. | Exercise two saved identities in the installed app. Check link expiry and test that Orbit resumes the pending source check for the intended account. |
| Codex can access host resources beyond the registered Orbit actions. | Prove the Windows tool boundary with fixtures first. The Responses API fallback uses the same Orbit actions if the local Codex configuration cannot meet that boundary. |
| Production setup obscures data cleanup or introduces background startup. | Test install, explicit launch, exit, restart behavior, and user-directed cleanup against a disposable Windows profile. |

## Inputs to settle when needed

- For the first live publishing proof, choose a destination the owner can authorize and an explicitly approved test post. The fake provider path can be built first.
- Seed reporting fixtures from the November 6–15 example. Use the owner's latest verified baseline when available and preserve the recorded Discord invite coverage.
- Verify supported login, link registration, live metric access, and the Codex boundary on the target PC before declaring the affected workflow ready.
