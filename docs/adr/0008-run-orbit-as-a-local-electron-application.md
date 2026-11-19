# Run Orbit as a local Electron application

## Status

Proposed on 2026-11-19. The product behavior in ADRs 0001–0007 is the basis for this design.

## Context

| Evidence | Requirement or constraint |
| --- | --- |
| **Known** | Orbit is a standalone Windows workspace for one owner. It starts on demand. Account sessions and workspace data stay on the PC, and the local scheduler runs while the app is open. |
| **Known** | The left sidebar switches between saved accounts and Orbit screens. Real Facebook, Reddit, X, and Tumblr pages open in the center. Multiple tabs for a saved account share its session. Two saved accounts on the same platform have separate sessions. |
| **Known** | The calendar and the agent can queue a post for a named account and destination. A post captures its own caption and media. The calendar supports authorized automatic publishing and prepared drafts for handoff. |
| **Known** | Home shows totals and comparable trends from saved reports. Reports run on request and preserve dates, scopes, and source links. Discord contributes reporting metrics. The right Agent panel starts collapsed and shares its current conversation across tabs. |
| **Known** | The project has a package manifest, an Electron dependency, a test, and product decisions. The earlier implementation plan lists Postiz as the first provider. |
| **Assumed** | One owner, one Windows installation, and a modest number of active tabs are the initial operating scale. The owner wants low fixed costs. A separate delivery schedule, staffing plan, formal service-level target, and regulated compliance requirements are unknown. |

Sources for product behavior are [PRODUCT.md](../../PRODUCT.md), the [glossary](../../GLOSSARY.md), and [the earlier implementation plan](../superpowers/plans/2026-11-18-social-workspace.md).

## Options

- **A. Electron desktop app with local modules.** React, TypeScript, and Vite for the workspace, Electron browser views, and SQLite owned by the main process. Start a Codex App Server child on demand. The app owns the schedule and its recovery.
- **B. WPF desktop app with WebView2.** C# and .NET LTS own lifecycle, jobs, and SQLite. Use named WebView2 profiles for social views and a React bundle for the workspace. This Windows-native option has a shared browser runtime. It becomes the better choice if measured install size or runtime update requirements outweigh keeping the host and workspace in TypeScript. [WebView2 profiles](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/multi-profile-support) · [Evergreen runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version)
- **C. Electron workspace with a separate local service.** React and Electron own the interface and account views. A Node.js TypeScript service owns jobs, SQLite, and agent tools through local IPC. This gives the backend a separate process and creates a second lifecycle to supervise. Revisit this option if scheduling needs to continue after the window closes or a publisher needs an independent runtime.

Scores are architectural judgments for Orbit's initial scope. Each rating is from 1 to 5.

| Requirement and weight | A | B | C |
| --- | ---: | ---: | ---: |
| Separate browser sessions and in-window account switching · 25% | 5 | 5 | 5 |
| On-demand lifecycle and local resource use · 15% | 4 | 5 | 3 |
| Durable publishing and recoverable outcomes · 20% | 5 | 5 | 4 |
| Site, credential, and agent boundaries · 15% | 4 | 4 | 4 |
| Implementation and maintenance effort · 15% | 5 | 3 | 2 |
| Agent and publishing provider integration · 10% | 5 | 4 | 4 |
| **Weighted score** | **4.70** | **4.45** | **3.80** |

## Decision

Recommend **A**. It satisfies the local lifecycle, fits the existing scaffold, and keeps the write path for the app and agent under one owner. Split the code by responsibility within the desktop app. [Architecture diagrams](../architecture/orbit-desktop-architecture.md)

- **Workspace and browsing.** React owns the left sidebar, Home, Calendar, Analytics, Media, and the collapsible Agent panel. Electron main owns each live site view and binds it to a stable persistent partition keyed by saved account ID. Open views as needed. Close the view when a tab closes and retain its partition for the next launch. The site controls login expiration. Present the signed-in identity before an account can be selected for publishing. [Electron sessions](https://www.electronjs.org/docs/latest/api/session) · [Electron browser views](https://www.electronjs.org/docs/latest/api/web-contents-view)
- **Data.** Keep SQLite and media under one Orbit-specific local data directory. Use app-owned IDs and versioned, transactional migrations. Store media bytes on disk and keep references in SQLite. At scheduling time, finish saving selected media, including Drive attachments, before committing the post and its media references. Preserve the captured content when the source draft or media library entry changes. Keep browser storage and integration secrets separate from workspace tables. [SQLite transactions](https://sqlite.org/lang_transaction.html) · [Content capture decision](0004-preserve-scheduled-content-and-verify-publishing.md)
- **Publishing.** Let the calendar and agent use the same application commands. Store the publish instant in UTC and show it in Asia/Bangkok. The app runs a single scheduler during its active lifetime. On launch, mark times missed while closed as Overdue. On Windows resume, reconcile jobs that came due during suspension with the same user-facing choice. Commit an attempt before calling a provider. Check for a verified result after a timeout or interrupted attempt and surface Verify publication if the outcome is still uncertain. Keep schedule timing in Orbit. A connected provider is called when an authorized job becomes due or the owner chooses Publish now. Prepared drafts remain available per destination. The earlier plan's Postiz integration can be evaluated as a provider behind this boundary. [Electron app lifecycle](https://www.electronjs.org/docs/latest/api/app) · [Windows suspend and resume events](https://www.electronjs.org/docs/latest/api/power-monitor) · [Publishing recovery](0004-preserve-scheduled-content-and-verify-publishing.md) · [Postiz API](https://docs.postiz.com/public-api/introduction)
- **Reports.** Start collection from Analytics or chat. Track each source independently and keep working on other sources during the two reconnect windows. Save each verified observation with its value, unit, scope, source, reporting period, and verification time. A carried-forward report metric points to its prior observation and retains its date. Home shows the latest saved totals and charts distinct, comparable verified observations. Seed the first comparison with the owner's existing numbers. [On-demand comparison](0005-compare-weekly-engagement-on-demand.md) · [Chart history](0007-chart-verified-metric-totals-from-saved-reports.md)
- **Agent and trust boundary.** Use Codex App Server over local stdio with Codex-managed ChatGPT sign-in, subject to plan access. Persist the active chat reference in Orbit and start a fresh one from New chat. Expose narrow actions for current-tab reading, work across relevant accounts, drafts, scheduling, media, and reports. Route tool calls through the same validation as UI commands. Keep remote site views sandboxed and allow Orbit's privileged IPC only from its trusted UI. Store integration credentials using Windows-backed secure storage. Send the model only task-relevant records or visible page content. Keep cookie stores, secrets, and direct database access outside its tools. Test Codex's built-in commands and read access on Windows against this boundary. If they cannot be confined, use the Responses API with Orbit's registered tools and keep the same chat interface. [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling) · [Electron security](https://www.electronjs.org/docs/latest/tutorial/security) · [Electron secure storage](https://www.electronjs.org/docs/latest/api/safe-storage) · [Codex App Server](https://developers.openai.com/codex/app-server)

## Consequences and risks

| Choice or risk | Impact and check |
| --- | --- |
| Electron host and account partition IDs | Moving desktop hosts can require signing in again. Use opaque account IDs and verify two accounts on one platform retain separate sessions after closing and reopening Orbit. |
| Canonical account, destination, and metric identities | Changing established identities can break the calendar or comparison history. Validate Facebook Page versus Group, two Reddit logins, X post views versus reply views, and Discord invite coverage with fixtures from the owner's report. |
| SQLite as the primary store | Multi-owner sync or a remote worker would change the write and deployment model. Keep the schema versioned and provider credentials separate so workspace records can be migrated independently. |
| Provider access and delivery uncertainty | Browser sign-in and API authorization can fail independently. Test a fake timeout after a provider has accepted a post. Verify that recovery checks the result before allowing another attempt. Check current provider capabilities before enabling a publishing destination. |
| Agent integration | Model availability and account limits depend on the provider. Keep the calendar and reports callable directly from Orbit. Keep Codex-specific thread state behind the agent adapter. Test the action validation with controlled requests before connecting live accounts. |
| Runtime maintenance | Electron bundles the browser runtime. Verify cold start and memory on the owner's PC with representative tabs open, and keep the runtime on a supported release. [Electron release schedule](https://releases.electronjs.org/schedule) |

## Assumptions register

| Assumption | Basis | Check |
| --- | --- | --- |
| Orbit has one active installation and one owner in the first version. | The local, on-demand workspace is intended for individual use. | Revisit lifecycle and storage if the owner asks for a second installation to share the same queue. |
| Selected page excerpts and report records can be sent to the configured model for the task the owner requests. | The owner requested Codex-style reading of active and relevant account tabs. | Inspect a representative test payload with the owner and check that it contains only the visible content and records needed for the request. |
| SQLite and local files can handle the initial volume. | A few managed accounts, one local media library, and user-triggered reports. | Measure with several historical reports, representative video sizes, and the busiest planned week. |

## Open questions for the next design review

1. **Unknown · Account compatibility.** Will each of the four sites sign in, distinguish saved identities, and reopen reliably in the embedded view on this Windows PC? Test two Reddit accounts first, then one account on each other site as access permits.
2. **Unknown · First automated destination.** Which destination has usable authorization for the first real publish test? Prefer one that can be exercised with a draft or test post. Keep the draft handoff available for the rest.
3. **Unknown · First baseline and Discord coverage.** Which copy of the report and collection log should seed the baseline, and which Discord invite links count toward the owner's figure? Preserve the verified date and stated coverage of whichever records are imported.
4. **Unknown · Agent compatibility.** Can the installed Codex executable expose Orbit's actions and enforce its Windows read boundary? Test this in the local proof. Use the installed executable for the proof and assess packaging independently before distribution.

## Research notes

Vendor documentation and GitHub reference code were checked on 2026-11-19. GitHub searches located the [Electron view API source](https://github.com/electron/electron/blob/03c2bc4b855923daf35c439471e6ac8e39effa03/docs/api/web-contents-view.md) and [Codex app-server protocol reference](https://github.com/openai/codex/blob/60fcb1649f0c3213d9d44c7c0caaca6459fb7c6c/codex-rs/app-server/README.md). Context7 was unavailable in this session. Framework capabilities were checked against the linked official docs. Live account compatibility, integration authorization, and memory use are still unverified.
