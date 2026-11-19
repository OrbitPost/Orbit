# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Creators and social account managers use Orbit to work with Facebook, Reddit, X, and Tumblr from a Windows PC. They switch between accounts, prepare and schedule posts, and check engagement against the previous report when they need an update.

## Product Purpose

Orbit brings account browsing, post planning, media, and engagement reporting into one local workspace. The owner can use multiple signed-in accounts, plan posts across destinations, and compare verified engagement figures over time.

## Positioning

The workspace combines real platform pages with an in-app chat that understands both the signed-in tab and the workspace's drafts, calendar, media, and reports. The owner can move from reading a particular post to asking for a comparison across their saved accounts in the same window.

## Operating Context

- The standalone workspace runs on demand on the owner's Windows PC. Its data and saved account sessions persist locally between launches.
- The calendar uses Bangkok time. The publishing worker runs while the workspace is open.
- The owner starts the weekly report with the **Run weekly report** button or by asking in chat. A request without explicit dates covers activity from the previous report cutoff through the current check.

## Capabilities and Constraints

- **Home.** Shows the latest saved report's numeric totals and a platform breakdown. The owner can pin and swap up to four headline metrics. Selecting a headline metric or choosing a metric from the dropdown changes the single history chart. Each metric shows its verification date or reporting window and any comparable change. Home updates when a newly requested report is saved. A chart point opens the associated report with its figures and post links. **Next up** shows the next scheduled post and any overdue count, with a link to Calendar.
- **Accounts and tabs.** New Tab shows the saved accounts and **Add account** for Facebook, Reddit, X, and Tumblr. Each saved account has its own persistent session. Tabs for the same account share that session. The collapsible sidebar provides access to Home, account tabs, Calendar, Analytics, and Media.
- **Calendar.** A dedicated tab shows published and scheduled posts on a full calendar. Posts published directly on a platform appear once the workspace has a verified live link and publish time.
- **Chat.** The Agent panel starts collapsed. Reopening it and switching tabs preserve the conversation. **New chat** starts a fresh conversation. A request about the current page uses the tab displayed in the center when the message is sent. A request to work in that browser can navigate from that tab. Work directed elsewhere uses the Agent browser in the intended saved session, with a live view in chat. **Take over** pauses the Agent and brings its page into the center. **Resume** returns control to the Agent. Chat can read and act on workspace records from any tab.
- **Chat controls.** Orbit's replies align left and the owner's messages align right. **Previous chats** reopens saved conversations. The model picker uses the active connection. Each chat retains its selection. New chats start from the Settings model, or the available ChatGPT default when needed. The Agent divider remembers the chosen width and leaves room for the center pane on smaller windows. The composer grows with the draft up to six lines, then scrolls.
- **Drafts and media.** One draft can share caption text and media across destinations, with wording tailored per destination. The media library holds images, videos, reusable text, and links. Scheduling a Drive attachment captures a local copy of the chosen file.
- **Scheduling.** Each scheduled post identifies the saved account, exact publishing destination, time, caption, and media. The calendar and explicit chat requests use the same scheduling behavior. Authorized integrations publish automatically, and prepared drafts let the owner finish publishing on other destinations. Each destination has its own result. Missed posts are marked **Overdue** and offer **Publish now** and **Reschedule**. An uncertain outcome is checked before retrying and shown as **Verify publication** when it needs the owner's attention.
- **Engagement.** Start the baseline from the owner's first saved report. Compare fresh figures with previous verified values for the same scope. Reports group figures and post links by platform and show the source and last verified date for figures carried forward. Discord contributes member counts and invite uses. Label invite-use counts **Your invite uses** and show their coverage, such as active invites only.
- **Reconnect during a report.** Keep checking other accounts while showing **Reconnect** and **Copy link** for an account that needs sign-in. After five minutes without either action, finish using the last verified figures for that account. The first click or copy opens a further five-minute window to sign in and refresh that account before the report finishes.

The [glossary](GLOSSARY.md) and [decision records](docs/adr/) define the agreed account, publishing, and reporting behavior.

## Product Principles

- Make the account and destination easy to check before a post is queued.
- Keep the calendar useful when a platform needs a publishing handoff, a reconnect, or a new publish time.
- Give the agent enough context to act on specific instructions and surface the details that still need a decision.
- Make every reported change traceable to comparable observations and their sources.
- Give Orbit the finish of a carefully made desktop tool. Use clear type and spacing to establish hierarchy, a restrained accent for selection and data, softly squared corners, and subtle glass on the app's side panels. Make controls feel immediate and reserve motion for useful feedback, panel transitions, and the startup reveal. Review the result in the desktop app with real interactions, keyboard focus, and reduced motion.
