# Orbit Home and chart polish

Status — Implemented and verified in the local desktop build

[Implementation tickets](.scratch/orbit-home-polish/issues/)

## Objective

Make Home feel like a carefully made desktop workspace. The owner should see the latest engagement totals, understand what changed, and open the supporting report without hunting through cards. Apply the same visual and interaction details to the shared controls used here. Use this pass to set the craft standard in [PRODUCT.md](PRODUCT.md).

## Review of the current Home

The review uses the current Home source and the 1440 × 900 preview with the Agent panel open.

| Before | After | Why |
| --- | --- | --- |
| The headline totals sit in four identical bordered cells. The selected cell uses a violet gradient. | Set the totals on one quiet strip with aligned tabular numbers and subtle separators. Mark the selected metric with a small accent indicator and a readable selected state. | The totals should be the first thing the eye finds. The selected metric should still be easy to locate. |
| The chart shares a row and a tall, bordered treatment with Next up. | Let one wide chart lead the page. Put a compact Next up row beneath it with the next scheduled post, overdue count when present, and a single Calendar link. | Home is primarily a report readout. A short row gives the publishing queue enough room and leaves more width for dates. |
| A smoothed area line and lavender fill connect all verified observations of the selected metric. | Use a fine line with visible observations, restrained grid lines, and gaps for incomparable periods. Remove the area fill. | The chart should show what was measured and where a direct comparison is meaningful. |
| The chart tooltip shows the value and check date. The keyboard shortcuts to saved reports cover the last six visible observations. | Show the total, metric scope, and reporting window or verification date at the focused observation. Give every plotted observation a corresponding keyboard-accessible report action. | The chart and the keyboard path should offer the same evidence, including older points. |
| Violet is prominent on multiple controls, and the Agent and navigation panels add colored edge treatments. | Use matte near-black in the center, one very light frosted surface per side panel, and a muted violet accent for the primary action, selection, and the chart series. | The material contrast and subtle orbital arc can give Orbit character while leaving the data clear. |
| Common buttons change color on hover. Panel widths use the same transition for repeated pointer and keyboard actions. | Give enabled buttons a subtle pressed state and visible focus. Keep pointer panel transitions brief and reversible. Open and close panels immediately from the keyboard. | A control should acknowledge an action quickly and feel predictable during repeated use. |

## Proposed experience

- **Reading order.** Start with the Overview title, latest saved reporting window, and totals. Follow with Engagement history, Next up, then Platform activity. Keep **Run weekly report** in the toolbar as the primary action. The existing Agent chat can also trigger a report. Saving a report updates Home and the chart.
- **Type and color.** Use the existing system font stack with comfortable label sizes, aligned number baselines, and tabular figures. Use near-white for primary content and a readable neutral for dates, metadata, and dividers. Use text and shape for meaningful states alongside color. Reserve gentle corner rounding for panels and controls.
- **Shell.** Keep the left navigation and collapsible Agent panel subtly frosted. The Agent starts collapsed. Keep the background of Orbit-owned center screens near-black and the embedded website crisp. Keep a single faint, static orbital arc on Home with clear space around the title, and preserve the rising Orbit mark and wordmark that lift and fade on startup. Reduced motion skips the startup reveal.
- **Metrics.** Start with Facebook Page views, X post views, Reddit community members, and Discord members when available. Allow an owner to pin or replace up to four metrics and retain their choices between launches. Selecting a headline metric or using the metric selector updates the same chart. Selecting a metric from the dropdown leaves the pins as chosen. Show the exact numeric total and its date range or verification date. The platform breakdown retains the source scope, including X post versus reply views and the saved coverage for **Your invite uses**.
- **Chart.** Show actual observations, including one-off readings and incomparable periods. Use the saved dates for ordering and proportional time spacing. Use straight segments where a comparison is valid. Show each period's date range in the observation detail and its report action. The detail anchors near the observation, stays inside the chart region, and preserves the plot's dimensions. It works with pointer and keyboard, and Enter on a focused report action opens the same saved report as clicking the point.
- **Comparability.** Match the existing metric scope and evidence rules. Equal known window lengths can compare for period totals. Incomparable consecutive observations keep separate points with a break in the line and no delta between them. Comparable point-in-time counts can show change across different elapsed times. Carried-forward values retain their last verified date and add no point. Postiz readings with unknown measurement windows show their check date. [Verified metric history](docs/adr/0007-chart-verified-metric-totals-from-saved-reports.md)
- **Next up and empty states.** Show the next scheduled post with destination and local time, an overdue count when present, and one link to Calendar. For reports, distinguish an observed zero, a carried-forward reading, and a missing reading. On a clean workspace, offer the existing Analytics baseline action once. With a baseline and a single verified observation, show its point without a trend line.
- **Motion and interaction.** Use short ease-out transitions for pointer-activated side panels and a subtle press response on buttons. A second click mid-transition should reverse the panel smoothly from its current position. Keep focus visible on both light and dark surfaces, restore it to the Agent toggle on close, and make collapsed controls inaccessible to keyboard navigation. Reduced motion applies layout changes immediately. Switching metrics updates the plot without replaying a reveal.

## Tech Stack

Use the existing Electron 45.3.4 desktop shell, React 19.3.1 renderer, TypeScript 7.0.2, Vite 8.3.8, Recharts 3.11.0, CSS, and local SQLite workspace. [Package manifest](package.json)

## Commands

Run from the Orbit project folder on Windows.

| Task | Command |
| --- | --- |
| Preview with fixture data | `npm.cmd run dev:web` |
| Check the desktop shell | `npm.cmd run dev` |
| Type check | `npm.cmd run typecheck` |
| Run tests | `npm.cmd test` |
| Build | `npm.cmd run build` |
| Type check, test, and build | `npm.cmd run verify` |

## Project Structure

Home lives in [src/ui/Home.tsx](src/ui/Home.tsx), the shell and navigation live in [src/ui/App.tsx](src/ui/App.tsx), and renderer styles live in [src/ui/styles.css](src/ui/styles.css). [src/ui/preview.ts](src/ui/preview.ts) supplies the browser preview fixtures. Reuse local workspace state and commands in [src/workspace.cjs](src/workspace.cjs) for persisted preferences and saved reports. The existing Node test runner uses [test/](test/).

## Code Style

Keep component and state names tied to the control or metric they describe. Reuse styles across Home and its shared controls. Use explicit transition properties and limit pressed motion to enabled controls. This CSS shows the intended press feedback.

```css
.button {
  transition: background-color 120ms ease-out, transform 120ms ease-out;
}

@media (prefers-reduced-motion: no-preference) {
  .button:active:enabled {
    transform: scale(0.97);
  }
}
```

## Testing Strategy

Use the existing Node tests for any changed history, comparison, and persistence behavior. Exercise zero totals, a single observation, carried-forward figures, different window lengths, distinct scopes, saved pin choices, and a history longer than six observations. Use the fixture preview to check layout and keyboard access, then verify panel movement, focus, and startup in Electron. Use test data and a disposable profile for desktop validation.

## Boundaries

- **Always** preserve saved reports, their source provenance, existing Calendar and Analytics navigation, and the paths to open a report or a scheduled post. Keep the V1 Home acceptance criteria aligned with [the existing Home ticket](.scratch/orbit-v1/issues/13-update-home-when-a-report-is-saved.md).
- **Ask first** before expanding this pass into a redesign of other screens or changing report calculations, publishing behavior, or the approved shell direction.
- **Never** use real account credentials or session data in design fixtures. Only verified, comparable pairs can produce a displayed delta.

## Success Criteria

- At 1440 × 900 and 1000 × 720, the title, next action, exact metric totals, chart selector, and plotted observations remain readable with the side panels in their supported states. Long labels and large totals fit without horizontal overflow or truncating the numbers. Report date labels stay legible and main content scrolls independently of the panels.
- The chart is the only large visualization. Next up takes one compact region with a single Calendar link. The light surfaces, near-black workspace, and quiet background arc are visible in both window sizes. Body text, essential labels, and controls meet their applicable contrast targets, including at least 4.5:1 for normal body text.
- In a fixture with a four-day and a ten-day views total, both points show their exact value and date range and open their respective reports. The line breaks between them and the delta is absent. A same-scope member count change across different dates still appears. A later carried-forward figure creates zero additional points.
- Selecting a metric from a tile or the dropdown shows the same history. Pins survive a relaunch, and saving a fresh report refreshes Home. Every plotted point has an equivalent keyboard report action, including observations older than the six most recent.
- Click each side panel toggle twice in quick succession. The panel reverses without a jump or content overlap. Keyboard operation gives immediate feedback and visible focus. With reduced motion enabled, the startup overlay is skipped and panel layout switches immediately.

## Out of Scope

- Full redesigns of Calendar, Analytics reports, Media, Settings, Agent conversations, and browsing workflows. Shared control improvements from this pass can carry through where those controls are already used.
- Changes to platform connectors, report scheduling, and publishing permissions.

## Open Questions

No pending behavior decisions.
