# Select Orbit's desktop development stack

## Status

Accepted by the owner on 2026-11-19. This stack decision supplements [ADR 0008](0008-run-orbit-as-a-local-electron-application.md) with a development and verification workflow.

## Requirements and gates

- **Known.** Orbit is a Windows workspace the owner starts on demand. Multiple saved accounts on one platform need separate persistent browser sessions inside the same window. The left sidebar and the Agent panel use restrained glass, and Orbit's own center screens use a dark workspace. The calendar, media, reports, and session profiles live on the PC. [Product brief](../../PRODUCT.md) · [Desktop architecture](../architecture/orbit-desktop-architecture.md)
- **Known.** The local app runs scheduled jobs while open. The calendar and reporting can be used without AI. Automatic publishing needs an authorized integration. Report collection is on demand and needs source-level recovery and comparable observations. [Local lifecycle](0001-run-on-demand-on-the-local-pc.md) · [Destination and authorization](0002-schedule-posts-for-explicit-destinations.md) · [Weekly reports](0005-compare-weekly-engagement-on-demand.md)
- **Assumed.** One owner and one primary Windows PC are the initial scale. A short feedback loop, few setup steps, and no fixed hosting bill matter more than minimizing the installer alone.
- **Unknown.** Live embedded sign-in on each site, provider authorization, installed-package behavior, and memory with real account tabs. Team familiarity and a delivery deadline are also unspecified.

| Hard gate | Electron | WPF with WebView2 |
| --- | --- | --- |
| One window with isolated saved account sessions | **Passed on a fixture.** Two same-origin profiles stayed separate across two app launches. | **Documented.** Named profiles support separate browser data. A native spike is pending if selected. |
| Local durable records and on-demand lifecycle | **Storage passed on a fixture.** SQLite commit and rollback were verified across launches. Scheduler recovery and installer behavior need product tests. | **Design fit.** Local SQLite and a window-owned scheduler. Implementation evidence is pending if selected. |
| Site views separated from privileged workspace actions | **Capabilities documented.** The probe used sandboxed views. IPC sender validation and end-to-end agent boundaries still need product tests. | **Capabilities documented.** The host controls WebView2 messages and named profiles. End-to-end checks are pending if selected. |
| Actual platform access | **Open.** Each site's real login and each automatic publishing destination need separate validation. | **Open.** Each site's real login and each automatic publishing destination need separate validation. |

Sources checked on 2026-11-19. [Electron session API](https://www.electronjs.org/docs/latest/api/session) · [Electron security](https://www.electronjs.org/docs/latest/tutorial/security) · [WebView2 named profiles](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/multi-profile-support) · [WebView2 security](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security)

## Candidates and scoring

| Layer | A. Electron | B. WPF + WebView2 |
| --- | --- | --- |
| Workspace | React 19.3.1, TypeScript 7.0.2, Vite 8.3.8 | Same React and TypeScript bundle, hosted by WPF on .NET 10 LTS |
| Desktop host | Electron 45.3.4, with embedded Node 24.22.3 and sandboxed `WebContentsView` | WebView2 SDK 1.0.4314.35 and the Evergreen browser runtime |
| Local data and scheduler | Embedded `node:sqlite`, local media, TypeScript scheduler in the app lifecycle | `Microsoft.Data.Sqlite`, local media, C# scheduler in the app lifecycle |
| Account and provider authentication | Persistent Electron partitions, Windows-backed `safeStorage`, optional Codex-managed ChatGPT login | Named WebView2 profiles, Windows DPAPI, optional Codex-managed ChatGPT login |
| Tests | `node:test` for domain logic and SQLite integration, Playwright 1.65.1 for browser fixtures, native process smoke on Windows | .NET tests for domain logic and SQLite, Playwright for browser fixtures, Edge WebDriver for native views on Windows |
| Development and distribution | npm, Vite Fast Refresh, Chromium DevTools, Electron Forge Windows packaging proposed | .NET SDK, Vite Fast Refresh, WPF and WebView2 DevTools, `dotnet publish` and an installer with WebView2 Evergreen detection proposed |

Exact versions in A were used in the disposable checks. Review supported security patches before pinning. The packaging choices and WPF configuration are proposed. [Electron release](https://releases.electronjs.org/release/v45.3.4) · [Node SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) · [React](https://react.dev/versions) · [TypeScript](https://www.typescriptlang.org/download/) · [Vite](https://vite.dev/guide/features.html) · [Electron Forge Windows maker](https://www.electronforge.io/config/makers/squirrel.windows) · [.NET support](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) · [WebView2 SDK](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4314.35) · [Evergreen runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version) · [Codex App Server](https://developers.openai.com/codex/app-server)

The scores are judgments on a 1–5 scale. Browser-based iteration and independent verification together carry 40% of the weight. These scores use a development-focused rubric distinct from ADR 0008.

| Criterion | Weight | A | B | Reason |
| --- | ---: | ---: | ---: | --- |
| Orbit UX and account profile model | 25% | 5 | 5 | Both can host the workspace and named site views in one window. |
| Developer iteration | 20% | 5 | 3 | A keeps TypeScript across app layers. B shares the browser preview and adds a C# host. |
| Testability and observability | 20% | 4 | 3 | A demonstrated browser feedback and a native launch probe. B adds a separate native driver setup. |
| Maintainability and ecosystem | 10% | 4 | 3 | A fits the existing scaffold. B needs two language toolchains for the proposed UI. |
| Installer and runtime footprint | 10% | 3 | 5 | B shares the Evergreen runtime. Actual tab memory is unmeasured. |
| Browser security maintenance | 10% | 4 | 5 | A ships Chromium updates with Orbit. Evergreen updates the browser runtime independently. |
| Cost and reversibility | 5% | 5 | 4 | Both can run without hosted infrastructure. A keeps more application code in one stack. |
| **Weighted total** | **100%** | **4.40** | **3.95** | |

## Proposed development contract

These are target entry points. The current scaffold still needs the app source and scripts.

| Workflow | A. Electron | B. WPF + WebView2 |
| --- | --- | --- |
| One-command start and refresh | `npm.cmd run dev` starts Vite and a disposable Electron dev instance. UI changes use React Fast Refresh. Main or preload changes restart the dev host. | A single `dev` launcher starts Vite and the WPF host. The renderer uses Fast Refresh. Native changes use Visual Studio XAML Hot Reload where supported or restart the host. |
| Fast visual preview | `npm.cmd run dev:web` opens Orbit screens with fixtures for loading, empty, connection error, and success. Use it for sidebar and chart iteration. The desktop preview checks actual embedded tabs and panel sizing. | Same Vite fixture preview. Use the WPF preview for host window and embedded view behavior. |
| Local state and reset | Dev and test data directories are explicit and separate from everyday Orbit data. Reset only the selected dev or test profile. | Same separation using explicit WebView2 user data folders and a dev database. |
| Troubleshooting | DevTools for renderer and view issues. Local structured events include request, account, job, and attempt IDs with reason codes. Repro bundles use fixture traces and screenshots. Session data, secrets, and private page content stay out of routine logs. | Same event and fixture policy. Use .NET logging and WebView2 DevTools for the native boundary. |
| Tests and CI | `npm.cmd run verify` runs strict checks, domain tests, SQLite integration tests, and Playwright fixture tests including keyboard and automated accessibility checks. Windows CI adds native profile isolation, restart, and installer smoke. | Same browser tests. Add `dotnet test` and a Windows WebView2 smoke using Edge WebDriver. |

Playwright's Electron API is experimental. The native proof used a directly launched Electron process. Start with a direct Windows smoke and prefer Playwright for the browser fixture suite unless the Electron driver proves reliable for a specific native assertion. [Playwright Electron status](https://playwright.dev/docs/api/class-electron) · [Trace viewer](https://playwright.dev/docs/trace-viewer) · [Accessibility testing](https://playwright.dev/docs/accessibility-testing) · [WPF Hot Reload](https://learn.microsoft.com/en-us/visualstudio/xaml-tools/xaml-hot-reload) · [WebView2 native testing](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/webdriver)

Use fake scheduler time and fake provider outcomes for missed schedules, uncertain publication, and reconnect timing. Pin fixture data and keep it reusable from browser tests and manual preview. Use a Windows machine for native verification and packaging. Browser fixture work can run on other developer platforms if needed.

## Verification on Windows

All passing checks below used a disposable app and dummy values outside the Orbit folder. The loopback site represented one origin accessed from two saved-account partitions.

| Check | Observed result |
| --- | --- |
| React/Vite preview | Playwright drove installed Chrome through loading, empty, error, and success. Editing the TSX heading updated the open page through Fast Refresh and preserved the component's incremented state. |
| Type checking and bundling | `tsc --project tsconfig.json --noEmit` passed under strict mode. `vite build` produced the fixture bundle. |
| Native isolation and restart | Two sandboxed Electron views on the same origin held different persistent cookies and localStorage values. A second view of the first partition read its values. Both partitions still held the expected separate values after closing the app and reopening it with the same disposable profile directory. |
| SQLite in the Electron process | `node:sqlite` committed one row. A deliberately failed transaction was rolled back. The committed row persisted through reopening and the rolled-back row was absent. |
| Existing Orbit scaffold | `npm.cmd test` failed because the existing test imports `src/workspace.cjs`, which is absent. Product tests are pending. [Existing test](../../test/workspace.test.cjs) |

To repeat the decisive native check, serve a dummy page at one fixed loopback origin, start two views with separate persistent partitions, and assert separate cookie and localStorage values plus sharing within a partition. Close the host, launch a fresh process with the same dev data path and origin, and repeat the reads. The same run can reopen a fixture database after a committed write and a rolled-back transaction. In the browser preview, change one fixture's heading with an in-memory edit already present and check that React keeps the edit.

**Still to verify** are real social logins, browser session expiry, sleep and restart recovery in Orbit's scheduler, the packaged app's startup and updates, performance with real tabs, and a confined Codex integration. WPF was evaluated from vendor documentation.

## Recommendation and reversibility

Select **A**. It preserves Orbit's account-tab model and demonstrated the two most important local developer workflows on Windows. Use **B** if measured footprint or browser update requirements outweigh the two-toolchain cost.

Keep the renderer and workspace command types independent of the desktop host. Keep provider interfaces and versioned SQLite migrations app-owned. A switch to WPF could reuse the UI assets and data schema, but would require a new host, adapter tests, and fresh sign-ins because the browser profile format and secret storage change with the host. [Architectural risks](0008-run-orbit-as-a-local-electron-application.md#consequences-and-risks)

[Chart and calendar research](../research/2026-11-19-orbit-chart-and-calendar-libraries.md) covers the recommended UI libraries and their acceptance checks.

The first product proof is a two-account Reddit sign-in and reopen test on a development profile, followed by the local scheduler's missed-post case with a fake provider.
