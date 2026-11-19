# Orbit implementation and open tickets

**Current status** The local build supports account browsing, prepared Calendar posts, desktop alert events, Agent connection options, and weekly reporting. Automatic publishing through the new Agent workflow is the main feature still to build. Postiz is retired for new scheduling. [Accepted publishing decision](../docs/adr/0010-agent-led-publishing.md)

## Implemented

| Feature | Current behavior |
| --- | --- |
| Windows workspace | Opens on demand with the local launcher. Persists saved accounts, media, Calendar entries, reports, and chat history. |
| Accounts and tabs | Platform → saved account → open tabs. Account-level **+**, per-tab **×** and right-click **Close tab**, platform logos and tints. Closing a tab keeps its saved login. |
| Tumblr recovery | A failed load offers Retry in the same tab and session. A disposable Electron test verified the recovery path. |
| Calendar and media | Bangkok-time planning, captured content and attachments, prepared handoff to the saved account, and verified publication recording. |
| Agent | Workspace queries, scoped tab reads, drafts, scheduling, and on-demand reports. Settings offers OpenAI API key and ChatGPT OAuth. ChatGPT sign-in and a live Agent reply were verified. |
| Desktop alert events | Prepared post due, opening for handoff, tab load failure, and publication recorded. Electron fixtures exercised these events. |
| Home and Analytics | Saved weekly reports and Markdown export, manual verified figures, scope-aware comparisons, pinned totals, and chart links to saved reports. The four Home polish tickets are complete. [Home spec](../SPEC-home-polish.md) |

## Work still open

| Priority | What is left | Ticket |
| --- | --- | --- |
| 1 | Build the first permitted Agent publishing route. An approved Calendar entry should publish while Orbit is open, save a verified link, and show start and result alerts. | [Agent 01](../.scratch/orbit-agent-publishing/issues/01-publish-approved-post-from-calendar.md) |
| 2 | Recover missed, failed, and interrupted Agent attempts. Prove that a retry cannot create a duplicate when the prior result is uncertain. | [Agent 02](../.scratch/orbit-agent-publishing/issues/02-recover-interrupted-agent-publishing.md) |
| 3 | Run one owner-approved live publish and verify it in Calendar. Expand to other permitted destinations. X uses prepared handoff unless an authorized X API route is selected. | [V1 22](../.scratch/orbit-v1/issues/22-verify-a-real-authorized-automatic-destination.md) · [Agent 05](../.scratch/orbit-agent-publishing/issues/05-enable-additional-permitted-destinations.md) |
| Parallel | Verify live scoped workspace and current-tab reads, API-key use, and authorization recovery. | [Agent 03](../.scratch/orbit-agent-publishing/issues/03-verify-live-chatgpt-sign-in.md) |
| Parallel | Verify actual Windows banners and that clicking one opens the correct Calendar entry. | [Agent 04](../.scratch/orbit-agent-publishing/issues/04-verify-windows-alert-delivery.md) |
| Parallel | Verify that the two Reddit accounts, X, and Tumblr stay signed in after reopening. Add and check Facebook when its account is available. | [V1 03](../.scratch/orbit-v1/issues/03-verify-live-social-sign-in-on-windows.md) |
| Parallel | Verify a manual publication handoff and the report reconnect workflow with a real account. | [V1 07](../.scratch/orbit-v1/issues/07-show-a-verified-publication-in-the-calendar.md) · [V1 12](../.scratch/orbit-v1/issues/12-reconnect-a-report-source-on-this-windows-pc.md) |
| Parallel | Connect and verify live weekly metrics sources for the four social platforms. Manual verified figures already work. Live Discord counts can be checked when the bot is configured. | [Facebook 14](../.scratch/orbit-v1/issues/14-collect-verified-facebook-page-and-group-metrics.md) · [Reddit 15](../.scratch/orbit-v1/issues/15-collect-verified-reddit-metrics.md) · [X 16](../.scratch/orbit-v1/issues/16-collect-verified-x-metrics.md) · [Tumblr 17](../.scratch/orbit-v1/issues/17-collect-verified-tumblr-metrics.md) · [Discord 18](../.scratch/orbit-v1/issues/18-show-discord-members-and-invite-uses.md) |
| After live checks | Build and verify the latest portable release. Windows Application Control blocked launching the earlier portable package on this PC. | [V1 24](../.scratch/orbit-v1/issues/24-package-and-verify-orbit-on-windows.md) |

## Original V1 ticket index

Tickets 08–10 record the earlier provider fixture and recovery work. Agent 01 and 02 cover the scheduler and recovery behavior for the new publishing path.

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 — Launch Orbit on demand](../.scratch/orbit-v1/issues/01-launch-orbit-on-demand.md) | — | Complete |
| [02 — Reopen two separate saved account sessions](../.scratch/orbit-v1/issues/02-reopen-two-separate-saved-account-sessions.md) | [01](../.scratch/orbit-v1/issues/01-launch-orbit-on-demand.md) | Complete |
| [03 — Verify live social sign-in on Windows](../.scratch/orbit-v1/issues/03-verify-live-social-sign-in-on-windows.md) | [02](../.scratch/orbit-v1/issues/02-reopen-two-separate-saved-account-sessions.md) | Four saved accounts · live reopen and Facebook pending |
| [04 — Save reusable media in the library](../.scratch/orbit-v1/issues/04-save-reusable-media-in-the-library.md) | [01](../.scratch/orbit-v1/issues/01-launch-orbit-on-demand.md) | Complete |
| [05 — Plan a prepared draft on the Bangkok Calendar](../.scratch/orbit-v1/issues/05-plan-a-prepared-draft-on-the-bangkok-calendar.md) | [02](../.scratch/orbit-v1/issues/02-reopen-two-separate-saved-account-sessions.md) | Complete |
| [06 — Capture scheduled media and Drive attachments](../.scratch/orbit-v1/issues/06-capture-scheduled-media-and-drive-attachments.md) | [04](../.scratch/orbit-v1/issues/04-save-reusable-media-in-the-library.md), [05](../.scratch/orbit-v1/issues/05-plan-a-prepared-draft-on-the-bangkok-calendar.md) | Complete |
| [07 — Show a verified publication in the Calendar](../.scratch/orbit-v1/issues/07-show-a-verified-publication-in-the-calendar.md) | [06](../.scratch/orbit-v1/issues/06-capture-scheduled-media-and-drive-attachments.md) | Local checks passed · live check pending |
| [08 — Publish a due post through a fixture integration](../.scratch/orbit-v1/issues/08-publish-a-due-post-through-a-fixture-integration.md) | [05](../.scratch/orbit-v1/issues/05-plan-a-prepared-draft-on-the-bangkok-calendar.md) | Complete for the retired provider fixture |
| [09 — Recover a missed schedule as Overdue](../.scratch/orbit-v1/issues/09-recover-a-missed-schedule-as-overdue.md) | [08](../.scratch/orbit-v1/issues/08-publish-a-due-post-through-a-fixture-integration.md) | Complete for the retired provider fixture |
| [10 — Verify an interrupted publishing attempt](../.scratch/orbit-v1/issues/10-verify-an-interrupted-publishing-attempt.md) | [08](../.scratch/orbit-v1/issues/08-publish-a-due-post-through-a-fixture-integration.md) | Complete for the retired provider fixture |
| [11 — Save an on-demand weekly report](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | [02](../.scratch/orbit-v1/issues/02-reopen-two-separate-saved-account-sessions.md) | Complete |
| [12 — Reconnect a report source on this Windows PC](../.scratch/orbit-v1/issues/12-reconnect-a-report-source-on-this-windows-pc.md) | [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | Local checks passed · live identity check pending |
| [13 — Update Home when a report is saved](../.scratch/orbit-v1/issues/13-update-home-when-a-report-is-saved.md) | [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | Complete |
| [14 — Collect verified Facebook Page and Group metrics](../.scratch/orbit-v1/issues/14-collect-verified-facebook-page-and-group-metrics.md) | [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | Local capture ready · authorized source needed |
| [15 — Collect verified Reddit metrics](../.scratch/orbit-v1/issues/15-collect-verified-reddit-metrics.md) | [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | Local capture verified · authorized source needed |
| [16 — Collect verified X metrics](../.scratch/orbit-v1/issues/16-collect-verified-x-metrics.md) | [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | Local capture ready · authorized source needed |
| [17 — Collect verified Tumblr metrics](../.scratch/orbit-v1/issues/17-collect-verified-tumblr-metrics.md) | [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md) | Local capture ready · authorized source needed |
| [18 — Show Discord members and invite uses](../.scratch/orbit-v1/issues/18-show-discord-members-and-invite-uses.md) | [13](../.scratch/orbit-v1/issues/13-update-home-when-a-report-is-saved.md) | Complete |
| [19 — Resume an Agent conversation](../.scratch/orbit-v1/issues/19-resume-an-agent-conversation.md) | [01](../.scratch/orbit-v1/issues/01-launch-orbit-on-demand.md) | Complete |
| [20 — Read the requested account scope from chat](../.scratch/orbit-v1/issues/20-read-the-requested-account-scope-from-chat.md) | [02](../.scratch/orbit-v1/issues/02-reopen-two-separate-saved-account-sessions.md), [19](../.scratch/orbit-v1/issues/19-resume-an-agent-conversation.md) | Reopened for active tab identification |
| [21 — Schedule or run a report from chat](../.scratch/orbit-v1/issues/21-schedule-or-run-a-report-from-chat.md) | [04](../.scratch/orbit-v1/issues/04-save-reusable-media-in-the-library.md), [05](../.scratch/orbit-v1/issues/05-plan-a-prepared-draft-on-the-bangkok-calendar.md), [09](../.scratch/orbit-v1/issues/09-recover-a-missed-schedule-as-overdue.md), [11](../.scratch/orbit-v1/issues/11-save-an-on-demand-weekly-report.md), [20](../.scratch/orbit-v1/issues/20-read-the-requested-account-scope-from-chat.md) | Complete |
| [22 — Verify a real authorized automatic destination](../.scratch/orbit-v1/issues/22-verify-a-real-authorized-automatic-destination.md) | [Agent 01](../.scratch/orbit-agent-publishing/issues/01-publish-approved-post-from-calendar.md), [Agent 02](../.scratch/orbit-agent-publishing/issues/02-recover-interrupted-agent-publishing.md) | Needs first Agent route, live authorization, and test-post approval |
| [23 — Apply the agreed launch and workspace design](../.scratch/orbit-v1/issues/23-apply-the-agreed-launch-and-workspace-design.md) | [02](../.scratch/orbit-v1/issues/02-reopen-two-separate-saved-account-sessions.md), [13](../.scratch/orbit-v1/issues/13-update-home-when-a-report-is-saved.md), [19](../.scratch/orbit-v1/issues/19-resume-an-agent-conversation.md) | Complete |
| [24 — Package and verify Orbit on Windows](../.scratch/orbit-v1/issues/24-package-and-verify-orbit-on-windows.md) | [03](../.scratch/orbit-v1/issues/03-verify-live-social-sign-in-on-windows.md), [07](../.scratch/orbit-v1/issues/07-show-a-verified-publication-in-the-calendar.md), [12](../.scratch/orbit-v1/issues/12-reconnect-a-report-source-on-this-windows-pc.md), [14](../.scratch/orbit-v1/issues/14-collect-verified-facebook-page-and-group-metrics.md), [15](../.scratch/orbit-v1/issues/15-collect-verified-reddit-metrics.md), [16](../.scratch/orbit-v1/issues/16-collect-verified-x-metrics.md), [17](../.scratch/orbit-v1/issues/17-collect-verified-tumblr-metrics.md), [18](../.scratch/orbit-v1/issues/18-show-discord-members-and-invite-uses.md), [21](../.scratch/orbit-v1/issues/21-schedule-or-run-a-report-from-chat.md), [22](../.scratch/orbit-v1/issues/22-verify-a-real-authorized-automatic-destination.md), [23](../.scratch/orbit-v1/issues/23-apply-the-agreed-launch-and-workspace-design.md) | Package built · blocked by Application Control |

## Verification

- The Windows fixture exercised isolated saved sessions, a copied reconnect link, report persistence, media capture, prepared and automatic fixture publishing, schedule recovery, and chat persistence.
- The unit and integration suite covers report comparisons and source scope, reconnect deadlines, Drive and Discord fixtures, and Agent action boundaries.
- Keep the remaining live and installation checks open. An authorized provider and the owner’s selected test post are prerequisites for live publishing. The portable executable requires Windows approval or a package that satisfies the applicable Application Control policy.
