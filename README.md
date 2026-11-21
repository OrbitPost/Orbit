# Orbit

Orbit is a local Windows desktop workspace for managing social accounts, planning posts, and tracking engagement. It keeps each account in its own browser session so you can switch between accounts and their tabs without signing out.

## What you can do

| Area | What works today |
| --- | --- |
| Accounts | Open separate signed-in sessions for Facebook, Reddit, X, and Tumblr. Group tabs by platform and account in the sidebar. |
| Calendar | Prepare posts, pick a date and time in Asia/Bangkok, and open the correct account and destination to finish publishing. Record the live link and time afterward. |
| Media | Store images, videos, captions, and links for reuse. Orbit can capture a local copy of a Drive attachment when an authorized Drive token is configured. |
| Engagement | Record verified figures, run reports on demand, and copy them as Markdown. Home shows the latest totals and compares figures with matching scope and coverage. |
| Agent | Ask about saved workspace records, prepare drafts, and use registered Orbit actions from chat. Connect through an eligible ChatGPT account or an OpenAI API key. Chat history and model choices are saved locally. |

Automatic social publishing, the Agent's separate live browser, and additional live metrics sources are in development. Orbit can collect Discord member estimates and invite uses with an authorized bot.

## Run on Windows

Install Node.js 24 or later with npm, then run these commands from the repository folder.

```powershell
npm.cmd ci
npm.cmd start
```

After the first build, double-click **Start Orbit.cmd** to open Orbit. Closing Orbit stops its local scheduler. Sessions and workspace data persist in `%APPDATA%\Orbit`.

## First steps

1. Use **+** beside **Accounts** to add a platform login. Use the **+** beside that account to open another tab in the same session.
2. Add reusable files and captions in **Media**, then create a prepared post in **Calendar**. Enable Windows alerts in **Settings** if you want reminders while Orbit is running.
3. In **Analytics**, choose **Record verified figure** and enter a reading from your account. Select **Run weekly report** to save the first comparison baseline. Pin up to four totals on **Home**.
4. To use chat, connect a provider in **Settings → Agent**. Orbit stores the credential using Windows-backed encryption. Agent requests send your prompt and the context needed for that request to the configured provider.

## Development

- `npm.cmd run dev` opens Electron with an isolated development profile.
- `npm.cmd run dev:web` opens the renderer preview with fictional sample data.
- `npm.cmd run verify` runs type checks, tests, and the production build.
- `npm.cmd run package:windows` builds a portable copy in `release`.
- Use `$commit-work` in Codex to review, stage, and write commits for this repository. [Repository skill](.agents/skills/commit-work/SKILL.md) · [Upstream revision](https://github.com/softaworks/agent-toolkit/tree/3027f20f3181758385a1bb8c022d4041dfb4de84/skills/commit-work)

See the [product brief](PRODUCT.md), [desktop architecture](docs/architecture/orbit-desktop-architecture.md), and [implementation tracker](tasks/todo.md).
