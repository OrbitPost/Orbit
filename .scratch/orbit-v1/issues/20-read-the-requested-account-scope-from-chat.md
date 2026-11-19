# 20 — Read the requested account scope from chat

**What to build** Ask the Agent about the current tab, all open tabs, or relevant saved accounts. The Agent can open the relevant saved account tabs when the task calls for them.

**Blocked by** [02 — Reopen two separate saved account sessions](02-reopen-two-separate-saved-account-sessions.md), [19 — Resume an Agent conversation](19-resume-an-agent-conversation.md)

**Status** Reopened for active tab identification

## Acceptance criteria

- [ ] A question about the current website identifies the account tab in the center workspace, even when other account tabs are open.
- [ ] A request to work in the current browser can navigate from the captured center tab. A request to work elsewhere opens the intended saved session in the Agent browser and shows it live in chat.
- [ ] **Take over** pauses the Agent and brings its page into the center in the same saved session. **Resume** returns control to the Agent.
- [ ] Switching tabs during a turn preserves the captured target, including when both tabs belong to the same saved account.
- [x] Cross-account requests access relevant saved sessions through scoped queries.
- [x] From any tab, the Agent can use registered queries for task-relevant saved accounts, drafts, Calendar entries, Media records, and saved reports.

## Verification

Check current-tab, open-tab, and saved-account requests with controlled accounts. Check registered workspace reads with fixture responses and exercise out-of-scope actions. Verify the Windows Codex tool boundary before live account use with managed ChatGPT sign-in. Verify the Responses API key fallback if the Codex setup cannot meet that boundary.

## Audit evidence

With one X tab and two Reddit tabs open, a current-website question listed the tabs and asked the owner to choose. The Agent can receive the open tabs without an indication of which one is displayed in the center.

Fixture tool calls are restricted to the current request’s captured tab or allowed saved accounts. The Responses API adapter uses the registered workspace queries. The separate managed Codex sign-in path remains unverified.

## References

[Saved account sessions](../../../docs/adr/0006-use-account-sessions-and-workspace-wide-chat.md) · [Module and local API design](../../../docs/architecture/orbit-module-and-local-api-design.md)
