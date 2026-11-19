# Orbit module and local API design

Proposed contracts for the [desktop architecture](orbit-desktop-architecture.md) and [accepted stack](../adr/0009-select-orbit-desktop-development-stack.md). The manifest currently pins Electron 45.3.4. The accepted build stack specifies React 19.3.1, TypeScript 7.0.2, Vite 8.3.8, and SQLite via Electron's Node 24.22.3. Recharts and FullCalendar are proposed renderer choices. [Manifest](../../package.json) · [Chart and calendar research](../research/2026-11-19-orbit-chart-and-calendar-libraries.md)

## Two local API shapes

| Shape | Example | Consequence |
| --- | --- | --- |
| Feature-specific bridges | `calendar.schedule(input)`, `agent.queuePost(input)`, `reports.start(input)` | Names are easy to discover. Each consumer has a bridge to maintain and can acquire its own permission, input, or retry rules. All bridges would still need to call the same domain services. |
| Shared operation catalog, grouped by domain | `invoke("publishing.plan", input)` from the Calendar. The Agent adapter maps its scheduling tool to that same operation. The scheduler calls the publishing service to claim due work. | One input and output contract per task, with request origin and allowed operations determined by the host. Each domain can evolve its own service. |

Choose the **shared operation catalog**. Keep it at the Electron and Agent boundaries. Domain modules call typed services directly. The catalog maps each allowed operation to a decoder, an origin policy, and a service call. The preload exposes a scoped bridge with this fixed catalog. [Electron 45.3.4 IPC guide](https://github.com/electron/electron/blob/v45.3.4/docs/tutorial/ipc.md) · [Context bridge](https://www.electronjs.org/docs/latest/api/context-bridge)

## State ownership

| Owner | Owns | Calls and callers |
| --- | --- | --- |
| **Accounts and tabs** | Saved account identity, active view, and account-to-session binding. A separate integration record holds the capability to publish or collect metrics. | The sidebar opens a stable saved account. The Agent asks for a bounded view of a turn's tab scope. Publishing resolves authorization for the exact account and destination. |
| **Drafts and media** | Shared draft copy, destination wording, and media library references. | Publishing asks for captured content at planning time. Storage stages selected files locally before publishing commits its calendar entries. |
| **Publishing** | Prepared drafts, scheduled posts, publishing attempts, and verified publications. | Calendar and chat use the same planning and editing commands. The scheduler claims a due post. Provider adapters submit and verify. |
| **Reporting** | Report runs, source checks, verified observations, prior comparisons, and saved reports. | Analytics and chat use the same start command. Home reads saved reports and comparable observations. |
| **Agent** | Current conversation, turn scope, and provider session reference. | The Agent can search and read relevant app records. The host maps approved actions to the catalog. |
| **Desktop and storage adapters** | Native browser views, OS integration, database migrations, transactions, provider credentials, and notification delivery. | The renderer reads projections through the preload. Services use repository methods and provider adapters. |

A saved account can have several tabs and several publishing destinations. The account ID selects the persistent session. During Add account, sign-in happens in a new session. Saving the account confirms its platform identity. A Facebook Page and Group stay separate destinations even when the same login manages both. A prepared draft may appear on the Calendar at a planned time. It remains a handoff to the person posting. A scheduled post is an automatic publishing commitment for an explicit account and destination. [Glossary](../../GLOSSARY.md) · [Account and destination decision](../adr/0002-schedule-posts-for-explicit-destinations.md) · [Account sessions](../adr/0006-use-account-sessions-and-workspace-wide-chat.md) · [Electron persistent partitions](https://www.electronjs.org/docs/latest/api/session#sessionfrompartitionpartition-options) · [Electron views](https://www.electronjs.org/docs/latest/api/web-contents-view)

## Proposed interface sketches

The types describe local requests and read models. They use serializable primitives and separate client input from IDs, revisions, and outcomes assigned by the host. The catalog below covers the core workflows. UI controls for opening a file picker and browser navigation stay with the desktop host.

```typescript
type Id<Name extends string> = string & { readonly entity: Name }
type AccountId = Id<"Account">
type DestinationId = Id<"Destination">
type DraftId = Id<"Draft">
type MediaId = Id<"Media">
type PostId = Id<"Post">
type PublicationId = Id<"Publication">
type ObservationId = Id<"Observation">
type AttemptId = Id<"PublishingAttempt">
type TabId = Id<"Tab">
type ReportId = Id<"Report">
type ReportRunId = Id<"ReportRun">
type ReportSourceId = Id<"ReportSource">
type MetricScopeId = Id<"MetricScope">
type RequestId = Id<"Request">
type UtcInstant = string & { readonly format: "UtcInstant" }

type Platform = "FACEBOOK" | "REDDIT" | "X" | "TUMBLR"
type PublishTarget = {
  accountId: AccountId
  destinationId: DestinationId
}
type BangkokTime = {
  date: string // YYYY-MM-DD
  time: string // HH:mm
  timeZone: "Asia/Bangkok"
}
type TimeWindow = { from: UtcInstant; toExclusive: UtcInstant }
type Revisioned<T> = { workspaceRevision: number; value: T }
type Change<Ref> = { id: Ref; expectedRevision: number; requestId: RequestId }

type PostContentInput = { title?: string; caption: string; mediaIds: readonly MediaId[] }
type DraftInput = PostContentInput & {
  destinationCopy: readonly { target: PublishTarget; title?: string; caption?: string }[]
}
type PlannedDestination = {
  target: PublishTarget
  at: BangkokTime
  expectedMode: "AUTOMATIC" | "PREPARED_DRAFT"
}
type PlanPublishingInput = {
  requestId: RequestId
  draftId: DraftId
  expectedDraftRevision: number
  destinations: readonly [PlannedDestination, ...PlannedDestination[]]
}
type PostRef = { postId: PostId; revision: number; target: PublishTarget }
type PublicationEvidence = { url: string; publishedAt: UtcInstant }
type Publication = PublicationEvidence & { id: PublicationId }

type CalendarEntry =
  | (PostRef & { kind: "PREPARED_DRAFT"; plannedAt: UtcInstant })
  | (PostRef & {
      kind: "SCHEDULED_POST"
      dueAt: UtcInstant
      state: "QUEUED" | "SENDING" | "OVERDUE" | "NEEDS_RECONNECT" |
        "FAILED" | "VERIFY_PUBLICATION"
    })
  | { kind: "PUBLISHED"; target: PublishTarget; postId?: PostId; publication: Publication }

type Observation = {
  id: ObservationId
  scopeId: MetricScopeId
  value: number
  period: TimeWindow
  verifiedAt: UtcInstant
  evidenceUrl?: string
}
type ReportMetric =
  | { kind: "VERIFIED"; observation: Observation }
  | { kind: "CARRIED_FORWARD"; observation: Observation; fromReportId?: ReportId }
  | { kind: "UNAVAILABLE"; scopeId: MetricScopeId }
type SavedReport = {
  id: ReportId
  period: TimeWindow
  scopes: readonly MetricScope[]
  metrics: readonly ReportMetric[]
  postEvidence: readonly { title: string; url: string; sourceLabel: string }[]
}
type ReportRun =
  | { id: ReportRunId; state: "CHECKING" }
  | { id: ReportRunId; state: "SAVED"; reportId: ReportId }
  | { id: ReportRunId; state: "INTERRUPTED" | "FAILED" }
type ReconnectPrompt =
  | { window: "WAITING_FOR_ACTION"; sourceId: ReportSourceId; deadline: UtcInstant }
  | { window: "WAITING_FOR_SIGN_IN"; sourceId: ReportSourceId; deadline: UtcInstant }
type ReportProgress = { run: ReportRun; prompts: readonly ReconnectPrompt[] }

type Operation<Input, Output> = { input: Input; output: Output }
type AccountSummary = { id: AccountId; platform: Platform; label: string }
type DestinationChoice = {
  target: PublishTarget
  label: string
  deliveryMode: "AUTOMATIC" | "PREPARED_DRAFT"
}
type DraftDetail = DraftInput & { id: DraftId; revision: number }
type MetricScope = {
  id: MetricScopeId
  label: string
  sourceLabel: string
  unit: string
  coverage?: string
}
type HomeMetric = {
  scope: MetricScope
  latest: ReportMetric
  comparableChange?: number
  history: readonly { observation: Observation; reportId: ReportId }[]
}

type Operations = {
  "accounts.list": Operation<{ platform?: Platform }, Revisioned<readonly AccountSummary[]>>
  "accounts.destinations": Operation<{ accountId: AccountId }, Revisioned<readonly DestinationChoice[]>>
  "tabs.openSavedAccount": Operation<{ accountId: AccountId }, { tabId: TabId }>
  "tabs.beginAddAccount": Operation<{ platform: Platform }, { tabId: TabId }>
  "tabs.saveAccount": Operation<{ tabId: TabId; label: string; requestId: RequestId }, AccountSummary>
  "drafts.get": Operation<{ draftId: DraftId }, Revisioned<DraftDetail>>
  "drafts.create": Operation<DraftInput & { requestId: RequestId }, DraftDetail>
  "drafts.edit": Operation<Change<DraftId> & { content: DraftInput }, DraftDetail>
  "media.list": Operation<{ after?: MediaId }, Revisioned<{
    items: readonly { id: MediaId; label: string }[]; next?: MediaId
  }>>
  "calendar.list": Operation<TimeWindow, Revisioned<readonly CalendarEntry[]>>
  "publishing.plan": Operation<PlanPublishingInput, readonly CalendarEntry[]>
  "publishing.editCapturedContent": Operation<Change<PostId> & { content: PostContentInput }, CalendarEntry>
  "publishing.reschedule": Operation<Change<PostId> & { at: BangkokTime }, CalendarEntry>
  "publishing.publishNow": Operation<Change<PostId>, { attemptId: AttemptId }>
  "publishing.openPreparedDraft": Operation<{ postId: PostId }, { tabId: TabId }>
  "publishing.verify": Operation<Change<PostId> & { publicationUrl?: string }, CalendarEntry>
  "reports.start": Operation<{ requestId: RequestId; period?: TimeWindow }, ReportRun>
  "reports.progress": Operation<{ runId: ReportRunId }, Revisioned<ReportProgress>>
  "reports.reconnect": Operation<{
    requestId: RequestId
    runId: ReportRunId
    sourceId: ReportSourceId
    action: "OPEN" | "COPY_LINK"
  }, Revisioned<ReportProgress>>
  "reports.get": Operation<{ reportId: ReportId }, Revisioned<SavedReport>>
  "home.metrics": Operation<Record<string, never>, Revisioned<readonly HomeMetric[]>>
}

type ErrorCode =
  | "INVALID_INPUT" | "NOT_FOUND" | "NOT_ALLOWED" | "CONFLICT"
  | "AUTHORIZATION_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "UNAVAILABLE"

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ErrorCode; message: string; field?: string } }

type WorkspaceChange = {
  revision: number
  areas: readonly ("accounts" | "drafts" | "media" | "calendar" | "reports")[]
}
type WorkspaceBridge = {
  invoke<K extends keyof Operations>(
    operation: K,
    input: Operations[K]["input"]
  ): Promise<Result<Operations[K]["output"]>>
  subscribe(listener: (change: WorkspaceChange) => void): () => void
}

type SubmitResult =
  | { kind: "PUBLISHED"; publication: PublicationEvidence }
  | { kind: "DEFINITE_FAILURE"; reason: string }
  | { kind: "UNKNOWN" }

type VerifyResult =
  | { kind: "PUBLISHED"; publication: PublicationEvidence }
  | { kind: "NOT_PUBLISHED" }
  | { kind: "UNRESOLVED" }
```

## Boundary behavior

- **Requests and errors.** Validate the trusted window and its frame before decoding an IPC request. Decode allowed operation names, payload shapes, revisions, IDs, content, and time when requests enter the host. The domain service resolves account/destination ownership, delivery eligibility, and expected revisions. Agent tools and provider responses have their own input decoders. Use the same result shape for expected failures. Consumers branch on the code. User-facing messages can evolve. Publish now returns an attempt ID once the host commits the attempt. Its outcome is read from the Calendar. [Electron sender validation](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages) · [IPC main](https://www.electronjs.org/docs/latest/api/ipc-main#ipcmainhandlechannel-listener)
- **State changes.** Commit the workspace revision alongside each durable change and send a small invalidation signal. The renderer subscribes before loading its first snapshot and refreshes affected queries when the signal is newer. A revision gap triggers a fresh read of visible projections. The preload calls the listener with serializable data. Keep the catalog with the shipped app and extend existing contracts with optional fields when possible. [Electron bridge types](https://www.electronjs.org/docs/latest/api/context-bridge#api-functions)
- **Agent scope.** Capture the relevant tab ID and account when a page-specific turn starts. Opening or reading other saved accounts requires the user's requested scope. For an explicit scheduling instruction, resolve the intended draft, exact target, date and time, and current delivery mode before using the shared command. Model output enters the same decoders as other tool inputs. Read selected page content as data. Keep host credentials and controls within the desktop process. Codex App Server's dynamic tools are experimental. Prove tool registration and Windows confinement before connecting live data. The Responses API can expose the same validated tool set if that proof fails. [Codex App Server](https://developers.openai.com/codex/app-server) · [Responses function calling](https://developers.openai.com/api/docs/guides/function-calling) · [Electron secure storage](https://www.electronjs.org/docs/latest/api/safe-storage)

## Publishing and recovery

1. **Plan.** Resolve each account/destination pair, draft revision, and expected delivery mode. Materialize media needed by the selected revision, including a local copy of scheduled Drive attachments. Commit the batch of entries and request receipt in one SQLite transaction. Each destination then has its own lifecycle. If a mode or revision changed after review, return `CONFLICT` with a safe message so the UI can reload the affected records. [Draft and destination decision](../adr/0003-share-drafts-and-publish-by-destination.md) · [Content capture](../adr/0004-preserve-scheduled-content-and-verify-publishing.md) · [SQLite transactions](https://www.sqlite.org/lang_transaction.html)
2. **Honor repeated requests.** A user gesture or authorized Agent intent issues one request ID. A retry reuses it. After checking the caller’s allowed action, claim its request ID atomically and store the normalized operation and input fingerprint. An identical retry returns the existing receipt or work reference. Different input under the same ID returns `IDEMPOTENCY_KEY_REUSED`. Preserve the receipt through its retry and recovery lifetime. The database claim for a post with an open attempt also arbitrates a due worker racing with Publish now. A single SQLite transaction records the selected attempt before the provider call. [SQLite unique indexes](https://www.sqlite.org/lang_createindex.html#unique_indexes) · [SQLite partial indexes](https://www.sqlite.org/partialindex.html)
3. **Dispatch and verify.** The provider adapter validates inputs and returns a confirmed publication, definite failure, or unknown outcome. A timeout or interrupted attempt goes through verification before another send. The open attempt stays attached to the post during verification, so another caller cannot claim it. A verified live URL and publication time update the Calendar. A positively confirmed absence allows an explicit retry. Ambiguity stays **Verify publication**. Use the provider's documented idempotency mechanism when one exists. Its key stays stable for the same unresolved publishing intent. [Publishing recovery decision](../adr/0004-preserve-scheduled-content-and-verify-publishing.md)
4. **Recover.** Reconcile persisted attempts first, then mark applicable queued posts **Overdue** if they came due while the scheduler was unavailable. The owner can choose **Publish now** or **Reschedule**. Keep a prepared draft as a handoff until Orbit has a verified publication. A post published directly on a site can enter the Calendar when its target, live link, and publish time are verified. [Destination decision](../adr/0002-schedule-posts-for-explicit-destinations.md) · [Desktop architecture](orbit-desktop-architecture.md) · [Windows power events](https://www.electronjs.org/docs/latest/api/power-monitor)

The publishing service converts the date and time entered in Bangkok to a UTC instant. Calendar range queries use a start-inclusive, end-exclusive window. Calendar components display the selected zone. The scheduler compares instants. [Chart and calendar research](../research/2026-11-19-orbit-chart-and-calendar-libraries.md) · [Temporal date and time](https://tc39.es/proposal-temporal/docs/plaindatetime.html)

## Reports and reconnect

Analytics and chat each start the same report run only on request. Default to the previous saved report cutoff through the current check. Capture the comparison baseline when the run starts. Each successful source check can advance its own baseline by verification time. If Orbit closes, retain committed observations and mark the unfinished run interrupted. The next on-demand run starts from the last saved report cutoff. A report can hold new verified observations, observations carried forward by reference, and unavailable metrics. A metric scope includes what was measured, the account or reporting subject, the unit, and the coverage needed for comparison. Plot distinct verified observations for the selected metric scope. Show each period total with its date range and join consecutive points only for comparable windows. Every point links to its report. [On-demand reporting](../adr/0005-compare-weekly-engagement-on-demand.md) · [Home metrics](../adr/0007-chart-verified-metric-totals-from-saved-reports.md)

A source needing sign-in exposes a deadline. Collection continues for the other sources. The first valid **Reconnect** or **Copy link** action within five minutes starts its separate five-minute sign-in window. Later clicks preserve that deadline. A refresh within the window can add a verified observation. After expiry, use the prior figure and verification date if present. Keep the owner's actual flow under test because an ordinary login in a system browser can use different storage from an embedded account. Proposed copied link behavior is an Orbit deep link that reopens the intended tab on this PC. Opening it resolves only the active prompt and its account. Test Windows registration, expiry, and how the packaged app handles a copied link. A platform-supported integration OAuth callback can reconnect that integration through its authorized flow. [Reconnect decision](../adr/0005-compare-weekly-engagement-on-demand.md) · [Electron deep links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app) · [Account session decision](../adr/0006-use-account-sessions-and-workspace-wide-chat.md)

## Verification scenarios

| Scenario | Expected behavior |
| --- | --- |
| Two Reddit logins and two tabs under one login | The first two accounts use separate sessions. Additional views of the same account share its session. Switching tabs during an Agent turn leaves the turn's captured account context intact. |
| One draft for a Facebook Page and Group | The connection can support automatic publishing for the Page and prepare a handoff for the Group. Revising the source draft preserves previously captured copy. |
| Same request delivered twice and simultaneous worker and Publish now | One set of entries is created. Reusing the request ID with different input is rejected. One attempt owns the provider call. |
| Provider accepts a post, then the app closes before recording the result | Reopening checks that attempt. A match saves the original publication. An unresolved result stays in **Verify publication**. |
| Bangkok just after midnight on a PC set to Los Angeles | Month entry and week slot save the same UTC instant and reopen on the same Bangkok date. |
| Copy link after four minutes for one of several sources | That source gets its sign-in window from the first action. Other sources continue. A second action leaves the deadline intact. |
| Stale Discord count or changing invite coverage | Home retains the original date. A carried-forward number adds no chart point. Coverage changes surface as separate comparison scopes. |

Live provider authorization, the Windows reconnect link, and the Codex tool boundary remain open for implementation verification.
