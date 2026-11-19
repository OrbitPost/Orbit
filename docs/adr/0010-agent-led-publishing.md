# Agent-led publishing from Orbit

Status — Accepted. Account tabs, recovery, Agent sign-in options, and Calendar handoff alerts implemented. Automatic publishing through a permitted write route remains open.

Orbit owns the Calendar, the chosen account and destination, and the captured content and media for each scheduled post. The Agent will handle eligible publishing through a permitted action for that platform. New Postiz scheduling is retired. Orbit keeps older evidence and unresolved attempts available for reconciliation.

## Proposed behavior

- Approving a scheduled entry authorizes that exact account, destination, caption, and media. Orbit starts the attempt only while running at its scheduled time. Preserve the existing **Overdue** decision for missed times and **Verify publication** for uncertain outcomes. [On-demand runtime](0001-run-on-demand-on-the-local-pc.md) · [Publication verification](0004-preserve-scheduled-content-and-verify-publishing.md)
- For an immediate publish request, the owner's explicit instruction to publish can authorize the exact account, destination, caption, and attachments they provide. When the Agent writes the post, it shows the exact draft and destination for approval before publication.
- Use permitted, platform-specific actions with a shared Calendar and verification workflow. A browser action checks the current controls and intended destination before acting. A change in the site, a sign-in challenge, or missing permission stops the attempt and leaves the entry available for handoff. X's published rules rule out browser-based automation on X. The available choices there are an owner-finished handoff and an authorized X API connection. [X automation rules](https://help.x.com/en/rules-and-policies/x-automation)
- Offer **Sign in with ChatGPT** and **OpenAI API key** for the Agent in Settings. Both use Orbit's scoped account-tab and workspace operations. The current OAuth implementation uses a loopback callback and the streamed Responses API, subject to ChatGPT plan eligibility. [Sign in with ChatGPT registration](https://developers.openai.com/siwc/token-sharing-open-source/sign-in) · [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- Preserve publication history and the provenance of older provider metrics when changing publishing modes. The audited workspace had four saved accounts and zero unfinished provider-backed entries. Other workspaces may still have an unresolved attempt that needs verification before switching modes.

## Account sidebar and alerts

The sidebar groups platforms, saved accounts, and their open tabs. Each saved account has its own **+**. Tabs support **×** and **Close tab** in their context menu. Closing a tab preserves the login. Branches use the muted official platform colors and real platform icons.

Orbit sends an alert when a prepared post comes due, when the account opens to finish it, if the tab fails to load, and when a verified publication is recorded. Automatic attempts will need equivalent start, issue, and verified-result alerts when a supported write route is available.
