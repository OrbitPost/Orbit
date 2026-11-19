# Orbit report reconnect specification — V1

**Status** Approved by the owner on 2026-11-19. Local timer, link, and report handling are fixture-verified. Live identity and installed protocol verification remain open.

## Assumptions

- **Copy link** is for reopening the relevant Orbit account tab on the owner's Windows PC. It identifies the pending report check for that saved account.
- A reconnect succeeds for the report when Orbit verifies the intended account and collects fresh figures for the requested metric scope.
- If Orbit closes during a report, its next launch shows the unfinished run as interrupted. The owner can start the next report from Analytics or chat. [Local API design](docs/architecture/orbit-module-and-local-api-design.md#reports-and-reconnect)

## Objective

Let the workspace owner recover an expired account session while a requested weekly report is running. Keep checking other accounts during that recovery. The saved report should show which figures were refreshed and when any carried-forward figures were last verified. [Product requirements](PRODUCT.md) · [Weekly report decision](docs/adr/0005-compare-weekly-engagement-on-demand.md)

## Success criteria

| Situation | Expected behavior |
| --- | --- |
| A report source needs sign-in | Show the saved account's label, **Reconnect**, **Copy link**, and the time remaining. Start a five-minute window when the prompt appears. Keep checking the other sources. |
| The owner clicks **Reconnect** before the deadline | Open or focus the sign-in flow for that saved account. The first accepted action starts its separate five-minute sign-in window. |
| The owner clicks **Copy link** before the deadline | Copy an Orbit link for this report check and saved account. A successful copy starts the same sign-in window as **Reconnect**. Opening the link on this PC during that window opens or focuses the same account's sign-in flow. A clipboard error leaves **Reconnect** available under the existing deadline. |
| The owner acts more than once | The first accepted action determines the sign-in deadline. Subsequent clicks, copies, or link opens keep that deadline. At the deadline, the prior window expires. |
| The owner signs in to the intended account before the sign-in deadline | Orbit confirms the saved identity in the session or reauthorized integration used for collection and attempts the pending refresh. Fresh, verified figures advance the baseline for the scopes refreshed. If the attempt fails, use the same fallback as an expired window. |
| The owner signs in under a different account | Keep the check pending for the original account within its remaining window. Keep its baseline intact. |
| The owner takes no action, or the sign-in window expires | Use the last verified figure, original verification date, and source for each affected metric when available. Mark a metric **Unavailable** when its scope has no prior verified figure. Save the report once its source checks have resolved or expired. |
| An expired link is opened, or Orbit was closed during the run | Show that the reconnect request has expired or the report was interrupted. Opening the link by itself starts no report. |
| A report with carried-forward metrics is saved | Home displays each available total with its original verification date. A carried-forward value adds no chart point. Each fresh, comparable point opens its saved report. |

The sign-in deadline measures the owner's time to reconnect. A confirmed sign-in within that window gets its pending refresh attempt before the source falls back. Collection remains independent per source. [Source behavior and baseline](docs/adr/0005-compare-weekly-engagement-on-demand.md) · [Home chart behavior](docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md)

## Technology and project structure

Use the accepted Electron, React, TypeScript, and SQLite stack. The Electron host owns the Windows link and opens the saved account session. The reporting module owns the prompt, deadlines, refresh outcome, and observation provenance. Analytics and chat use the same report commands. [Accepted stack](docs/adr/0009-select-orbit-desktop-development-stack.md) · [Module and API design](docs/architecture/orbit-module-and-local-api-design.md)

| Location | Responsibility |
| --- | --- |
| `src/` | Desktop host, reporting state, account-session actions, and Analytics UI. |
| `test/` | Deterministic fixtures and integration tests for source outcomes and deadlines. |
| `docs/adr/` | Accepted decisions about reports, account sessions, and metric history. |

Use explicit TypeScript variants for metric results. The following sketch uses the proposed contract's existing observation and scope types. The carried-forward variant retains the original observation.

```typescript
type ReportMetric =
  | { kind: "VERIFIED"; observation: Observation }
  | { kind: "CARRIED_FORWARD"; observation: Observation; fromReportId?: ReportId }
  | { kind: "UNAVAILABLE"; scopeId: MetricScopeId }
```

## Commands and verification

Run the following from the Orbit folder.

| Command | Verification | Availability |
| --- | --- | --- |
| `npm.cmd test` | Domain and integration tests for the deadline and report outcomes. | Available. |
| `npm.cmd run dev:web` | Preview the workspace and saved reports. | Available. |
| `npm.cmd run dev` | Exercise account-bound reconnect in a disposable Windows development profile. | Available. |
| `npm.cmd run verify` | Type checking, automated tests, and the renderer build. | Available. |

- Use a fake clock to cover expiry at the five-minute boundary, a copy after four minutes, repeat actions, and an on-time sign-in whose refresh finishes afterward.
- Use fixtures for the correct account, a different account, failed refresh, a missing baseline, and several sources resolving independently. Verify report persistence and Home history from the same observations.
- Check the installed Windows app with two saved accounts on one platform. Open a fresh copied link from another Windows app, verify it targets the intended saved session, then repeat with an expired link and an interrupted run. The desktop behavior remains to be verified. [Windows development workflow](docs/adr/0009-select-orbit-desktop-development-stack.md#proposed-development-contract)

## Boundaries

| Boundary | Requirement |
| --- | --- |
| **Always** | Bind each action to its active report run and saved account. Preserve the observation's source, scope, and date when carrying it forward. |
| **Ask first** | Extend the link to work across devices or change either five-minute window. |
| **Never** | Put credentials in a copied link or use another account's figures as the original account's baseline. |

**Deferred** Cross-device reconnect and sharing a report reconnect link with another person.

## Approval and remaining checks

The local Windows fixture confirmed that a copied link opens its intended account, an expired link shows a notice, a mismatched identity entry is rejected, and a confirmed figure can finish the pending report. The current workflow uses the owner's confirmation of the signed-in label in the saved tab. Automatic identity verification requires a trusted live source. Installed protocol registration remains open because Windows Application Control blocks the portable executable. [Reconnect ticket](.scratch/orbit-v1/issues/12-reconnect-a-report-source-on-this-windows-pc.md)
