import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChartNoAxesCombined, Clock3, SlidersHorizontal } from 'lucide-react'
import { EngagementHistory, readingPeriod } from './EngagementHistory'
import { metricChange, metricHistory } from './home-metrics.mjs'
import { formatCount, formatDate, formatDateRange, formatDay, formatTime, metricName, platformName, statusName } from './types'
import type { Metric, Post, Report, Workspace } from './types'
import facebookIcon from './brand/facebook.ico'
import redditIcon from './brand/reddit.png'
import xIcon from './brand/x.png'
import tumblrIcon from './brand/tumblr.ico'
import discordIcon from './brand/discord.ico'

const defaultMetrics = ['facebook.page.views', 'x.post.views', 'reddit.community.members', 'discord.members']
const platformIcons = { facebook: facebookIcon, reddit: redditIcon, x: xIcon, tumblr: tumblrIcon, discord: discordIcon }

export function headlineMetrics(data: Workspace) {
  const latest = data.reports.at(-1)?.metrics || []
  return (data.preferences.headlineMetrics ?? defaultMetrics).flatMap(key => latest.filter(metric => metric.key === key))
}

export function PlatformMark({ platform, small = false }: { platform: Metric['platform']; small?: boolean }) {
  return <img alt="" draggable={false} src={platformIcons[platform]}
    className={'platform-mark ' + platform + (small ? ' small' : '')} />
}

export function StatusMark({ status }: { status: Post['status'] }) {
  return <span className={'status-label status-' + status}><i />{statusName[status]}</span>
}

export function Home({ data, showReport, openPost, openCalendar, openAnalytics, editMetrics }: {
  data: Workspace
  showReport: (id: string) => void
  openPost: (id: string) => void
  openCalendar: () => void
  openAnalytics: () => void
  editMetrics: () => void
}) {
  const recent = data.reports.at(-1)
  const [chosen, setChosen] = useState('')
  const available = recent?.metrics || []
  const hero = headlineMetrics(data)
  const metricKey = available.find(metric => metric.key === chosen)?.key
    || hero[0]?.key || available[0]?.key
  const metric = available.find(item => item.key === metricKey)
  const histories = useMemo(() => new Map(
    (data.reports.at(-1)?.metrics || []).map(row => [row.key, metricHistory(data.reports, row.key)]),
  ), [data.reports])
  const next = data.jobs.filter(post =>
    post.status === 'scheduled' || post.status === 'prepared' && post.remind && !post.remindedAt
  ).sort((a, b) => a.at.localeCompare(b.at))[0]
  const nextAccount = next && data.accounts.find(account => account.id === next.accountId)
  const overdue = data.jobs.filter(post => post.status === 'overdue').length

  return <div className="home">
    <div className="overview-intro">
      <div className="orbit-decoration" aria-hidden="true"><i /><i /></div>
      <div>
        <h1>Overview</h1>
        {recent && <p>{formatDateRange(recent.periodStart, recent.periodEnd)} <span>·</span> Latest report</p>}
      </div>
      {available.length > 0 && <button type="button" className="text-link edit-metrics" onClick={editMetrics}>
        <SlidersHorizontal size={14} /> Edit metrics
      </button>}
    </div>

    {recent && hero.length > 0 && <div className="metric-strip" role="group" aria-label="Latest report metrics">
      {hero.map(item => {
        const history = histories.get(item.key) || []
        const latest = history.at(-1)
        const delta = metricChange(history, recent)
        const date = item.stale || !latest ? 'Last checked ' + formatDate(item.checkedAt) : readingPeriod(latest)
        return <button className="metric-tile" key={item.key} type="button"
          onClick={() => setChosen(item.key)} aria-pressed={metricKey === item.key}>
          <span className="metric-label"><PlatformMark platform={item.platform} small />{metricName(item)}</span>
          <span className="metric-value">{formatCount(item.value)}</span>
          <span className="metric-date">
            <span>{item.stale && <><Clock3 size={12} />{' '}</>}{date}</span>
            {delta != null && <strong className={delta < 0 ? 'delta down' : delta > 0 ? 'delta' : 'delta unchanged'}
              aria-label={'Change ' + formatCount(delta)}>
              {delta < 0 ? <ArrowDownRight size={13} /> : delta > 0 ? <ArrowUpRight size={13} /> : null}
              {delta >= 0 ? '+' : ''}{formatCount(delta)}
            </strong>}
          </span>
        </button>
      })}
    </div>}
    {!recent && <div className="baseline-strip">
      <ChartNoAxesCombined size={23} />
      <div><h2>Start your engagement history</h2><p>Record a verified figure in Analytics and run your first report.</p></div>
      <button className="button secondary" onClick={openAnalytics}>Open Analytics <ArrowRight size={15} /></button>
    </div>}

    {recent && <section className="chart-panel">
      <div className="section-heading">
        <div><h2>Engagement history</h2><p>Verified readings across saved reports</p></div>
        {metric && <div className="chart-select">
          <select aria-label="Metric" value={metricKey} onChange={event => setChosen(event.target.value)}>
            {available.map(item => <option key={item.key} value={item.key}>{metricName(item)}</option>)}
          </select>
        </div>}
      </div>
      {metricKey && <EngagementHistory key={metricKey} history={histories.get(metricKey) || []} open={showReport} />}
    </section>}

    <section className="next-up">
      <h2>Next up</h2>
      {next ? <button className="next-post" onClick={() => openPost(next.id)}>
        {nextAccount && <PlatformMark platform={nextAccount.platform} />}
        <span className="queue-copy"><strong>{next.title || next.text || next.target}</strong>
          <span>{next.target} · {formatDay(next.at)}, {formatTime(next.at)} Bangkok time</span>
        </span>
      </button> : <p className="muted">No scheduled posts</p>}
      <div className="next-actions">
        {overdue > 0 && <span className="status-label status-overdue">{overdue} overdue</span>}
        <button className="text-link" onClick={openCalendar}>View Calendar <ArrowRight size={15} /></button>
      </div>
    </section>

    {recent && <section className="platform-section">
      <div className="section-heading">
        <div><h2>Platform activity</h2><p>Numbers from the latest saved report</p></div>
        <button className="button secondary" onClick={() => showReport(recent.id)}>Open report <ArrowRight size={14} /></button>
      </div>
      <div className="platform-rows">
        {(['facebook', 'reddit', 'x', 'tumblr', 'discord'] as const).map(platform => {
          const rows = available.filter(metric => metric.platform === platform)
          return <div className="platform-row" key={platform}>
            <div><PlatformMark platform={platform} /><strong>{platformName[platform]}</strong></div>
            <div className="platform-row-data">
              {rows.length ? rows.map(row => <span className="platform-reading" key={row.key}>
                <span><b>{formatCount(row.value)}</b> {row.label}</span>
                {row.scope && <small>{row.scope}</small>}
                {row.coverage && <small>{row.coverage}</small>}
                {row.stale && <small>Last checked {formatDate(row.checkedAt)}</small>}
              </span>) : <span>Awaiting verified figures</span>}
            </div>
          </div>
        })}
      </div>
    </section>}
  </div>
}
