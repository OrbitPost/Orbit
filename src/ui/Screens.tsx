import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CalendarDays, Check, Clipboard, Clock3, ExternalLink, FileText, Film, FolderOpen, Image, Images, Link2, Plus, Send, Upload, X } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGrid from '@fullcalendar/react/daygrid'
import timeGrid from '@fullcalendar/react/timegrid'
import interaction from '@fullcalendar/react/interaction'
import theme from '@fullcalendar/react/themes/monarch'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/monarch/theme.css'
import '@fullcalendar/react/themes/monarch/palettes/purple.css'
import { PlatformMark, StatusMark } from './Home'
import { metricChange, metricHistory } from './home-metrics.mjs'
import { reportMetricDefinitions } from './report-metrics'
import { formatCount, formatDate, formatDateRange, formatLocalInput, formatTime, metricName, platformName, statusName } from './types'
import type { Destination, Draft, Media, Metric, Operations, Post, Report, Workspace } from './types'
import type { Run } from './App'

type PageTools = { data: Workspace; run: Run; notify: (message: string) => void }
const quietly = (request: Promise<unknown>) => { void request.catch(() => {}) }
const errorText = (error: unknown) => error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : 'Orbit could not complete that action.'

export function Calendar({ data, run, notify, preview, compose, selectPost }: PageTools & {
  preview: boolean; compose: (at?: string, draft?: Draft) => void; selectPost: (id: string) => void
}) {
  const [status, setStatus] = useState('all')
  const [record, setRecord] = useState(false)
  const visible = data.jobs.filter(post => status === 'all' || status === post.status)
  const entries = visible.map(post => ({
    id: post.id,
    title: post.title || post.text.slice(0, 75) || post.target,
    start: post.publishedAt || post.at,
    allDay: false,
    classNames: ['orbit-event', 'orbit-event-' + post.status],
    extendedProps: { status: statusName[post.status], target: post.target },
  }))
  return <div className="page calendar-page">
    <div className="page-intro"><div><h1>Calendar</h1><p>Scheduled and published posts · Asia/Bangkok</p></div>
      <button className="button primary" onClick={() => compose()}><Plus size={17} /> New post</button></div>
    <div className="calendar-tools">
      <label><span className="sr-only">Filter Calendar by status</span>
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(statusName).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
      <button className="button secondary" onClick={() => setRecord(!record)}>{record ? 'Close form' : 'Record a published post'}</button>
    </div>
    {record && <div className="surface inline-form"><PublicationForm accounts={data.accounts} onSave={async input => {
      await run('posts.record', input); setRecord(false); notify('Publication recorded.')
    }} /></div>}
    <section className="surface calendar-surface">
      <FullCalendar plugins={[theme, dayGrid, timeGrid, interaction]}
        timeZone="Asia/Bangkok" colorScheme="dark" initialView="dayGridMonth"
        initialDate={preview ? '2026-11-19' : undefined} height="auto"
        headerToolbar={{ start: 'prev,next today', center: 'title', end: 'dayGridMonth,timeGridWeek' }}
        events={entries} eventInteractive={true}
        dateClick={info => compose(info.allDay ? info.dateStr + 'T19:00' : formatLocalInput(info.date))}
        eventClick={info => selectPost(info.event.id)}
        eventContent={info => <div className="event-copy">
          <strong>{info.timeText && <span>{info.timeText} </span>}{info.event.title}</strong>
          <small>{info.event.extendedProps.status} · {info.event.extendedProps.target}</small>
        </div>} />
    </section>
    {data.drafts.length > 0 && <section className="saved-drafts">
      <div className="section-heading"><div><h2>Saved drafts</h2><p>Pick up where you left off</p></div></div>
      <div className="draft-list">{data.drafts.map(draft => <button className="surface draft-item" key={draft.id} onClick={() => compose(undefined, draft)}>
        <FileText size={18} /><span>{draft.title || draft.text || 'Media draft'}</span><ArrowRight size={16} />
      </button>)}</div>
    </section>}
  </div>
}

type DraftTarget = Destination & { key: string }
const newTarget = (accountId = ''): DraftTarget => ({ key: crypto.randomUUID(), accountId, target: '', integrationId: '' })

export function Composer({ data, initialAt, draft, run, done, addAccount }: {
  data: Workspace; initialAt?: string; draft?: Draft; run: Run; done: (message: string) => void; addAccount: () => void
}) {
  const [title, setTitle] = useState(draft?.title || '')
  const [caption, setCaption] = useState(draft?.text || '')
  const [mediaIds, setMediaIds] = useState(draft?.mediaIds || [])
  const [targets, setTargets] = useState<DraftTarget[]>(() => draft?.destinations.map(item => ({ ...item, integrationId: '', key: crypto.randomUUID() }))
    || (data.accounts.length ? [newTarget(data.accounts[0].id)] : []))
  const [at, setAt] = useState(initialAt || formatLocalInput(new Date(Date.now() + 3600000)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pendingPlan = useRef<{ intent: string; draftId: string; requestId: string } | null>(null)
  const updateTarget = (key: string, changes: Partial<Destination>) => setTargets(current => current.map(item =>
    item.key === key ? { ...item, ...changes } : item))
  async function submit(schedule: boolean) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const destinations = targets.filter(item => item.accountId && item.target.trim()).map(({ key, ...item }) => item)
      if (schedule && (!destinations.length || destinations.length !== targets.length)) throw new Error('Fill in the account and exact destination for every entry.')
      if (schedule && !at) throw new Error('Choose a Bangkok publish time.')
      const intent = JSON.stringify([draft?.id, title, caption, destinations, mediaIds, at])
      let queued = pendingPlan.current
      if (!schedule || queued?.intent !== intent) {
        const saved = await run('drafts.save', { id: draft?.id, title, text: caption, destinations, mediaIds })
        queued = { intent, draftId: saved.id, requestId: crypto.randomUUID() }
        pendingPlan.current = queued
      }
      if (schedule) {
        const jobs = await run('posts.plan', { draftId: queued.draftId, at, requestId: queued.requestId })
        done(jobs.length === 1 ? 'Post added to Calendar.' : jobs.length + ' posts added to Calendar.')
      } else done('Draft saved.')
    } catch (reason) { setError(errorText(reason)) }
    finally { setBusy(false) }
  }
  return <form className="form composer" onSubmit={event => { event.preventDefault(); quietly(submit(true)) }}>
    <label>Title <span className="muted">(optional)</span><input value={title} onChange={event => setTitle(event.target.value)}
      placeholder="Post title" maxLength={250} /></label>
    <label>Caption<textarea value={caption} onChange={event => setCaption(event.target.value)} placeholder="Write your post…" rows={4} maxLength={12000} /></label>
    {data.media.length > 0 && <fieldset className="attachment-list"><legend>Media library</legend>
      {data.media.map(item => <label key={item.id}><input type="checkbox" checked={mediaIds.includes(item.id)}
        onChange={event => setMediaIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />
        {item.label}</label>)}
    </fieldset>}
    <div className="form-heading"><h3>Destinations</h3><button type="button" className="button secondary"
      onClick={() => data.accounts.length ? setTargets([...targets, newTarget(data.accounts[0].id)]) : addAccount()}><Plus size={15} />{data.accounts.length ? 'Add destination' : 'Add account'}</button></div>
    {targets.map(item => {
      const account = data.accounts.find(entry => entry.id === item.accountId)
      return <fieldset className="destination" key={item.key}>
        <legend>Publishing destination</legend>
        <div className="form-row">
          <label>Saved account<select value={item.accountId} onChange={event => updateTarget(item.key, { accountId: event.target.value, integrationId: '', handoffUrl: undefined })}>
            {data.accounts.map(entry => <option key={entry.id} value={entry.id}>{platformName[entry.platform]} · {entry.label}</option>)}
          </select></label>
          <label>Exact destination<input value={item.target} onChange={event => updateTarget(item.key, { target: event.target.value })}
            placeholder={account?.platform === 'reddit' ? 'r/community' : 'Page, blog, profile, or HTTPS link'} maxLength={200} /></label>
          <button className="icon-button" type="button" aria-label="Remove destination" onClick={() => setTargets(targets.filter(entry => entry.key !== item.key))}><X size={17} /></button>
        </div>
        <label>Destination link <span className="muted">(optional)</span>
          <input type="url" value={item.handoffUrl || ''} placeholder="https://…"
            onChange={event => updateTarget(item.key, { handoffUrl: event.target.value || undefined })} />
        </label>
        <details><summary>Customize caption for this destination</summary>
          <textarea aria-label="Destination caption" rows={2} maxLength={12000} value={item.text || ''}
            onChange={event => updateTarget(item.key, { text: event.target.value })} placeholder="Uses the shared caption when empty" />
        </details>
      </fieldset>
    })}
    <label>Reminder time <span className="muted">· Asia/Bangkok</span><input type="datetime-local" value={at} onChange={event => setAt(event.target.value)} /></label>
    <p className="muted">Orbit alerts you when it’s time to finish this post in the saved account.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => quietly(submit(false))}>Save draft</button>
      <button type="submit" className="button primary" disabled={busy}><CalendarDays size={16} />{busy ? 'Saving…' : 'Add to Calendar'}</button></div>
  </form>
}

function PublicationForm({ id, accounts, onSave }: {
  id?: string; accounts: Workspace['accounts']; onSave: (input: Operations['posts.record'][0]) => Promise<void>
}) {
  const [accountId, setAccount] = useState(accounts[0]?.id || '')
  const [target, setTarget] = useState('')
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [time, setTime] = useState(formatLocalInput())
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onSave({ id, accountId, target, text, url: link, publishedAt: time + ':00+07:00', verified }) }
    catch (reason) { setError(errorText(reason)) }
    finally { setBusy(false) }
  }
  return <form className="form" onSubmit={submit}>
    {!id && <div className="form-row">
      <label>Account<select required value={accountId} onChange={event => setAccount(event.target.value)}>
        <option value="" disabled>Choose an account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.label}</option>)}
      </select></label>
      <label>Destination<input required value={target} onChange={event => setTarget(event.target.value)} /></label>
    </div>}
    {!id && <label>Caption<input value={text} onChange={event => setText(event.target.value)} /></label>}
    <label>Live post link<input required type="url" value={link} onChange={event => setLink(event.target.value)} placeholder="https://…" /></label>
    <label>Published at · Asia/Bangkok<input required type="datetime-local" value={time} onChange={event => setTime(event.target.value)} /></label>
    <label className="publication-confirmation"><input required type="checkbox" checked={verified}
      onChange={event => setVerified(event.target.checked)} /> I opened the live post and checked its publication time.</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" type="submit" disabled={busy}><Check size={16} /> Record verified link</button>
  </form>
}

export function PostDetails({ data, post, run, notify, handoff }: PageTools & { post: Post; handoff: (post: Post) => void }) {
  const [newTime, setNewTime] = useState(formatLocalInput(post.at))
  const [record, setRecord] = useState(false)
  const [reschedule, setReschedule] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(post.title)
  const [caption, setCaption] = useState(post.text)
  const account = data.accounts.find(item => item.id === post.accountId)
  return <div className="post-detail">
    <div className="post-detail-status"><StatusMark status={post.status} /><span>{formatDate(post.publishedAt || post.at)}, {formatTime(post.publishedAt || post.at)} · Bangkok</span></div>
    <h3>{post.title || post.target}</h3>
    {account && <p className="post-account"><PlatformMark platform={account.platform} small />{account.label} → {post.target}</p>}
    <p className="post-caption">{post.text}</p>
    {post.media.length > 0 && <div className="media-buttons">{post.media.map(item => <button key={item.id} className="button secondary" onClick={() => quietly(run('media.open', { id: item.id }))}>
      <AttachmentIcon kind={item.kind} size={15} /> {item.label}</button>)}</div>}
    {post.problem && <p className="callout">{post.problem}</p>}
    <div className="form-actions left">
      {post.status === 'prepared' && <button className="button primary" onClick={() => handoff(post)}>Open account to finish <ArrowRight size={16} /></button>}
      {post.status === 'verify' && <button className="button primary" onClick={() => quietly(run('posts.verify', { id: post.id }))}>Check provider</button>}
      {['prepared', 'verify'].includes(post.status) && <button className="button secondary" onClick={() => setRecord(!record)}>Record live link</button>}
      {['scheduled', 'overdue', 'failed'].includes(post.status) && <button className="button primary" onClick={() => quietly(run('posts.publish', { id: post.id }))}>
        <Send size={15} /> Publish now</button>}
      {['prepared', 'scheduled', 'overdue', 'failed'].includes(post.status) && <button className="button secondary" onClick={() => setReschedule(!reschedule)}>Reschedule</button>}
      {['prepared', 'scheduled', 'overdue', 'failed'].includes(post.status) && <button className="button secondary" onClick={() => setEditing(!editing)}>Edit caption</button>}
      {post.url && <button className="button secondary" onClick={() => quietly(run('links.open', { url: post.url || '' }))}><ExternalLink size={15} /> Open post</button>}
    </div>
    {reschedule && <form className="form" onSubmit={event => {
      event.preventDefault()
      quietly(run('posts.reschedule', { id: post.id, at: newTime }).then(() => { setReschedule(false); notify('Time updated.') }))
    }}>
      <label>New publish time · Asia/Bangkok<input value={newTime} onChange={event => setNewTime(event.target.value)} type="datetime-local" required /></label>
      <button className="button primary" type="submit">Save new time</button>
    </form>}
    {record && <PublicationForm id={post.id} accounts={data.accounts} onSave={async input => {
      await run('posts.record', input); setRecord(false); notify('Publication recorded.')
    }} />}
    {editing && <form className="form" onSubmit={event => {
      event.preventDefault()
      quietly(run('posts.edit', { id: post.id, title, text: caption }).then(() => { setEditing(false); notify('Post updated.') }))
    }}>
      <label>Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={250} /></label>
      <label>Caption<textarea value={caption} onChange={event => setCaption(event.target.value)} rows={4} maxLength={12000} /></label>
      <button className="button primary" type="submit">Save caption</button>
    </form>}
  </div>
}

const reportPlatforms = ['facebook', 'reddit', 'x', 'tumblr', 'discord'] as const

function evidencePlatform(url: string) {
  const host = new URL(url).hostname
  return reportPlatforms.find(platform => {
    const domain = platform + '.com'
    return host === domain || host.endsWith('.' + domain)
  }) || (host === 'twitter.com' || host.endsWith('.twitter.com') ? 'x' : undefined)
}

function ReconnectCountdown({ deadline }: { deadline: number }) {
  const [clock, setClock] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.ceil((deadline - clock) / 1000))
  return <time>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} remaining</time>
}

export function Analytics({ data, report, run, notify, start, reporting, select }: PageTools & {
  report?: Report; start: () => Promise<void>; reporting: boolean; select: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState('')
  const [value, setValue] = useState('')
  const [coverage, setCoverage] = useState('')
  const [source, setSource] = useState('')
  const [recordedAt, setRecordedAt] = useState(formatLocalInput())
  const [verifiedAccount, setVerifiedAccount] = useState('')
  const [reconnectAccount, setReconnectAccount] = useState('')
  const [identity, setIdentity] = useState('')
  const [target, setTarget] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const reportIndex = data.reports.findIndex(item => item.id === report?.id)
  const reports = data.reports.slice(0, reportIndex + 1)
  const metrics = report?.metrics.map(row => ({
    ...row, delta: metricChange(metricHistory(reports, row.key), report),
  })) || []
  const recordedMetrics = new Map(data.observations.map(item => [item.key, item]))
  for (const item of metrics) if (!recordedMetrics.has(item.key)) recordedMetrics.set(item.key, item)
  const metricOptions = new Map(reportMetricDefinitions.map(item => [item.key, item]))
  for (const [key, item] of recordedMetrics) metricOptions.set(key, item)
  const metric = metricOptions.get(selected)
  const observation = recordedMetrics.get(selected)
  const canReport = Boolean(report || data.observations.length || data.preferences.discordConfigured)
  function selectAccount(id: string) {
    setVerifiedAccount(id)
    setReconnectAccount(data.reportPrompts?.some(prompt => prompt.accountId === id) ? id : '')
    setIdentity('')
  }
  function copyReport() {
    if (!report) return
    const sections = reportPlatforms.flatMap(platform => {
      const rows = metrics.filter(item => item.platform === platform)
      const figures = rows.map(row => {
        const name = row.url ? '[' + row.label + '](' + row.url + ')' : row.label
        const delta = row.delta != null && !row.stale ? ' (' + (row.delta >= 0 ? '+' : '') + row.delta + ')' : ''
        return '- ' + name + ' · **' + formatCount(row.value) + delta + '** · '
          + (row.stale ? 'Last verified ' : 'Checked ') + formatDate(row.checkedAt)
          + (row.scope ? ' · ' + row.scope : '')
          + (row.periodStart && row.periodEnd ? ' · ' + formatDateRange(row.periodStart, row.periodEnd) : '')
          + (row.coverage ? ' · ' + row.coverage : '')
      })
      const posts = report.posts?.filter(item => evidencePlatform(item.url) === platform) || []
      const missed = report.missedSources?.filter(item => item.platform === platform).map(item =>
        '- ' + item.label + (item.status === 'carried-forward' ? ' · Figures carried forward.' : ' · Figures unavailable.')) || []
      return ['## ' + platformName[platform], '', ...(figures.length ? figures : ['- Figures unavailable.']), '',
        ...missed,
        ...(posts.length ? ['**Posts**', '', ...posts.map(item => '- [' + item.title + '](' + item.url + ')'), ''] : [])]
    })
    const title = '# Weekly engagement report · ' + formatDateRange(report.periodStart, report.periodEnd)
    const other = report.posts?.filter(item => !evidencePlatform(item.url)).map(item => '- [' + item.title + '](' + item.url + ')') || []
    quietly(run('clipboard.copy', { text: [title, '', ...sections, ...(other.length ? ['## Other posts', '', ...other, ''] : []), report.notes].join('\n') }).then(() => notify('Report copied as Markdown.')))
  }
  async function saveMetric(event: FormEvent) {
    event.preventDefault()
    if (!metric || value === '') return
    await run('reports.import', { accountId: verifiedAccount || undefined,
      reconnect: reconnectAccount ? { identity } : undefined, rows: [{
      ...observation, ...metric, value: Number(value), checkedAt: recordedAt + ':00+07:00',
      url: source || undefined, coverage: coverage || undefined,
      target: target || undefined,
      periodStart: periodStart ? periodStart + ':00+07:00' : undefined,
      periodEnd: periodEnd ? periodEnd + ':00+07:00' : undefined,
    }] })
    setEditing(false); setValue(''); notify('Verified figure saved for the next report.')
  }
  return <div className="page analytics-page">
    <div className="page-intro"><div><h1>Analytics</h1><p>Weekly engagement and saved comparisons</p></div>
      <button className="button primary" disabled={reporting || !canReport} onClick={() => quietly(start())}><Plus size={17} />{reporting ? 'Preparing report…' : 'Run weekly report'}</button></div>
    {data.preferences.reportInterrupted && <p className="callout">The last report was interrupted. Run a new report when you’re ready.</p>}
    {data.reportPrompts?.map(prompt => {
      const account = data.accounts.find(item => item.id === prompt.accountId)
      if (!account) return null
      return <div className="surface reconnect-prompt" key={account.id}>
        <PlatformMark platform={account.platform} />
        <div><strong>{account.label}</strong><p>{prompt.window === 'refreshing' ? 'Saving verified figures…' : <>
          {prompt.window === 'action' ? 'Sign-in needed · ' : 'Finish signing in, then record your verified figure · '}
          <ReconnectCountdown key={prompt.deadline} deadline={prompt.deadline} />
        </>}</p></div>
        {prompt.window !== 'refreshing' && <div className="reconnect-actions">
          <button className="button secondary" onClick={() => quietly(run('reports.reconnect', { accountId: account.id, copy: false }))}>Reconnect</button>
          <button className="button secondary" onClick={() => quietly(run('reports.reconnect', { accountId: account.id, copy: true }).then(() => notify('Reconnect link copied.')))}>Copy link</button>
        </div>}
      </div>
    })}
    {!report && !editing && <section className="surface empty">
      <FileText size={31} /><h2>Create your engagement baseline</h2>
      <p>Record metrics from your accounts, then run your first report. Future reports compare with those figures.</p>
      <button className="button primary" onClick={() => setEditing(true)}>Record verified figure</button>
    </section>}
    {report && (
      <div className="analytics-actions">
        <label><span className="sr-only">Saved report</span><select value={report.id} onChange={event => select(event.target.value)}>
          {[...data.reports].reverse().map(item => <option key={item.id} value={item.id}>{item.baseline ? 'Baseline · ' : ''}{formatDate(item.periodEnd)}</option>)}
        </select></label>
        <div><button className="button secondary" onClick={() => setEditing(!editing)}>Record verified figure</button>
          <button className="button secondary" onClick={copyReport}><Clipboard size={15} /> Copy report</button></div>
      </div>
    )}
      {editing && <form className="surface form inline-form" onSubmit={event => quietly(saveMetric(event))}>
        <h2>Record verified figure</h2>
        <div className="form-row">
          <label>Metric<select required value={selected} onChange={event => {
            const next = recordedMetrics.get(event.target.value)
            setSelected(event.target.value); setSource(next?.url || ''); setCoverage(next?.coverage || '')
            selectAccount(next?.accountId || '')
            setTarget(next?.target || '')
            setPeriodStart(''); setPeriodEnd('')
          }}>
            <option value="" disabled>Choose a metric</option>{[...metricOptions.values()].map(item =>
              <option value={item.key} key={item.key}>{platformName[item.platform]} · {metricName(item)}</option>)}
          </select></label>
          <label>Total<input type="number" required min="0" step="any" value={value} onChange={event => setValue(event.target.value)} /></label>
        </div>
        {data.accounts.some(account => account.platform === metric?.platform) && <div className="form-row">
          <label>Saved account<select value={verifiedAccount} onChange={event => selectAccount(event.target.value)}>
            <option value="" disabled={Boolean(observation?.accountId)}>No saved account</option>
            {data.accounts.filter(account => account.platform === metric?.platform).map(account =>
              <option key={account.id} value={account.id}>{account.label}</option>)}
          </select></label>
          {verifiedAccount && <label>Measured destination<input required value={target} maxLength={120}
            placeholder={metric?.platform === 'reddit' ? 'e.g. r/community' : 'Page, group, profile or blog'}
            onChange={event => setTarget(event.target.value)} /></label>}
        </div>}
        {reconnectAccount && <label>Signed-in account label<input required value={identity} maxLength={100}
          onChange={event => setIdentity(event.target.value)} autoComplete="off" />
          <small>Check the identity in the saved tab before recording the figure.</small></label>}
        <div className="form-row">
          <label>Verified at · Bangkok<input type="datetime-local" required value={recordedAt} onChange={event => setRecordedAt(event.target.value)} /></label>
          <label>Source link<input type="url" required={Boolean(verifiedAccount)} value={source} onChange={event => setSource(event.target.value)} /></label>
          <label>Coverage<input value={coverage} onChange={event => setCoverage(event.target.value)} placeholder="e.g. Active invites only" /></label>
        </div>
        <div className="form-row">
          <label>Period start · Bangkok<input type="datetime-local" value={periodStart} onChange={event => setPeriodStart(event.target.value)} /></label>
          <label>Period end · Bangkok<input type="datetime-local" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} /></label>
        </div>
        <button className="button primary" type="submit"><Check size={16} /> Save figure</button>
      </form>}
    {report && <section className="surface report">
        <div className="section-heading"><div><h2>Weekly engagement</h2><p>{formatDate(report.periodStart)} – {formatDate(report.periodEnd)}</p></div>
          {report.baseline && <span className="report-baseline">Baseline</span>}</div>
        {reportPlatforms.map(platform => {
          const rows = metrics.filter(item => item.platform === platform)
          return <div className="report-platform" key={platform}>
            <div className="report-platform-head"><PlatformMark platform={platform} /><h3>{platformName[platform]}</h3></div>
            {rows.length === 0 && <p className="muted">Figures unavailable.</p>}
            {report.missedSources?.filter(item => item.platform === platform).map(item =>
              <p className="muted" key={item.accountId}>{item.label} · {item.status === 'carried-forward' ? 'Figures carried forward' : 'Figures unavailable'}</p>)}
            <div className="report-metrics">{rows.map(row => <div className="report-metric" key={row.key}>
              <div><strong>{row.label}</strong>{row.scope && <small>{row.scope}</small>}
                {row.coverage && <small>{row.coverage}</small>}
                {row.periodStart && row.periodEnd && <small>{formatDateRange(row.periodStart, row.periodEnd)}</small>}</div>
              <span className="report-number">{formatCount(row.value)}{row.delta != null && !row.stale && <small> {row.delta >= 0 ? '+' : ''}{formatCount(row.delta)}</small>}</span>
              <span className={row.stale ? 'stale-label' : 'metric-date'}>{row.stale && <Clock3 size={13} />}{row.stale ? 'Last verified ' : ''}{formatDate(row.checkedAt)}</span>
              {row.url && <button aria-label={'Open source for ' + row.label} className="icon-button" onClick={() => quietly(run('links.open', { url: row.url || '' }))}><ExternalLink size={15} /></button>}
            </div>)}</div>
          </div>
        })}
        {!!report.posts?.length && <div className="report-platform"><h3>Posts</h3><div className="draft-list">{report.posts.map(item =>
          <button className="draft-item" key={item.url} onClick={() => quietly(run('links.open', { url: item.url }))}>
            <span>{item.title}</span><ExternalLink size={14} />
          </button>)}</div></div>}
        {report.notes && <p className="report-notes">{report.notes}</p>}
      </section>}
  </div>
}

function AttachmentIcon({ kind, size = 22 }: { kind: Media['kind']; size?: number }) {
  const Icon = { image: Image, video: Film, text: FileText, link: Link2, drive: FolderOpen }[kind]
  return <Icon size={size} />
}

export function MediaLibrary({ data, run, notify }: PageTools) {
  const [adding, setAdding] = useState<'text' | 'link' | 'drive' | null>(null)
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [filter, setFilter] = useState('all')
  const visible = data.media.filter(item => filter === 'all' || item.kind === filter)
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!adding) return
    await run('media.save', { kind: adding, label, value }); setAdding(null); setLabel(''); setValue(''); notify('Added to Media.')
  }
  return <div className="page media-page">
    <div className="page-intro"><div><h1>Media</h1><p>Images, videos, and reusable content</p></div>
      <button className="button primary" onClick={() => quietly(run('media.pick', undefined).then(items => { if (items.length) notify('Media imported.') }))}><Upload size={16} /> Import files</button></div>
    <div className="media-toolbar">
      <label><span className="sr-only">Filter media</span><select value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">All media</option><option value="image">Images</option><option value="video">Videos</option><option value="text">Text</option><option value="link">Links</option><option value="drive">Drive files</option>
      </select></label>
      <div><button className="button secondary" onClick={() => setAdding('text')}><FileText size={15} /> Add text</button>
        <button className="button secondary" onClick={() => setAdding('link')}><Link2 size={15} /> Add link</button>
        <button className="button secondary" onClick={() => setAdding('drive')}><FolderOpen size={15} /> Add Drive file</button></div>
    </div>
    {adding && <form className="surface form inline-form" onSubmit={event => quietly(save(event))}>
      <h2>{adding === 'drive' ? 'Add a Drive file' : adding === 'link' ? 'Add a link' : 'Add reusable text'}</h2>
      {adding === 'drive' && <p className="muted">Orbit downloads a local copy when you attach this file to a scheduled post.</p>}
      <label>Name<input required maxLength={150} value={label} onChange={event => setLabel(event.target.value)} /></label>
      {adding !== 'text' ? <label>URL<input required type="url" value={value} placeholder="https://drive.google.com/…" onChange={event => setValue(event.target.value)} /></label>
        : <label>Text<textarea required rows={3} value={value} onChange={event => setValue(event.target.value)} /></label>}
      <div className="form-actions left"><button className="button primary" type="submit">Save item</button>
        <button className="button secondary" type="button" onClick={() => setAdding(null)}>Cancel</button></div>
    </form>}
    {visible.length ? <div className="media-grid">
      {visible.map(item => <article className="surface media-item" key={item.id}>
        <div className={'media-preview ' + item.kind}><AttachmentIcon kind={item.kind} size={30} /></div>
        <div className="media-item-copy"><h2>{item.label}</h2>
          <p>{item.value || (item.kind === 'image' ? 'Image' : 'Video')}</p></div>
        <footer>{item.kind === 'text' || item.kind === 'link' || item.kind === 'drive'
          ? <button className="button secondary" onClick={() => quietly(run('media.copy', { id: item.id }).then(() => notify('Copied.')))}><Clipboard size={15} /> Copy</button>
          : <button className="button secondary" onClick={() => quietly(run('media.open', { id: item.id }))}><FolderOpen size={15} /> Open file</button>}</footer>
      </article>)}
    </div> : <section className="surface empty"><Images size={32} /><h2>No media here yet</h2><p>Import images and videos, or save text and links for your drafts.</p></section>}
  </div>
}

export function Preferences({ data, run, notify }: PageTools) {
  const [model, setModel] = useState(data.preferences.agentModel)
  const [agentMode, setAgentMode] = useState(data.preferences.agentMode || 'api-key')
  const [apiKey, setKey] = useState('')
  const [driveToken, setDriveToken] = useState('')
  const [discordGuild, setDiscordGuild] = useState(data.preferences.discordGuild || '')
  const [discordInviter, setDiscordInviter] = useState(data.preferences.discordInviter || '')
  const [discordToken, setDiscordToken] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (data.preferences.agentMode) setAgentMode(data.preferences.agentMode)
  }, [data.preferences.agentMode])
  async function save(event: FormEvent) {
    event.preventDefault(); setError('')
    try {
      await run('settings.save', { model, agentMode, apiKey: apiKey || undefined,
        driveToken: driveToken || undefined, discordGuild, discordInviter, discordToken: discordToken || undefined })
      setKey(''); setDriveToken(''); setDiscordToken(''); notify('Settings saved on this PC.')
    } catch (reason) { setError(errorText(reason)) }
  }
  return <form className="form" onSubmit={event => quietly(save(event))}>
    <h3>Agent</h3>
    <div className="platform-picker" aria-label="Agent connection">
      <button type="button" className={agentMode === 'chatgpt' ? 'selected' : ''} aria-pressed={agentMode === 'chatgpt'}
        onClick={() => setAgentMode('chatgpt')}>ChatGPT account</button>
      <button type="button" className={agentMode === 'api-key' ? 'selected' : ''} aria-pressed={agentMode === 'api-key'}
        onClick={() => setAgentMode('api-key')}>OpenAI API key</button>
    </div>
    {agentMode === 'chatgpt' ? <div className="agent-connection">
      <p className="muted">{data.preferences.chatGPTConnected ? 'ChatGPT is connected on this PC.'
        : 'Connect in your browser using an eligible ChatGPT account.'}</p>
      {data.preferences.chatGPTPending ? <div className="form-actions left">
        <span role="status" className="muted">Waiting for sign-in…</span>
        <button className="button secondary" type="button" onClick={() => quietly(run('agent.cancelChatGPT', undefined))}>Cancel sign-in</button>
      </div> : <button className="button secondary" type="button"
        onClick={() => quietly(run('agent.connectChatGPT', undefined))}>
        {data.preferences.chatGPTConnected ? 'Reconnect ChatGPT' : 'Sign in with ChatGPT'}
      </button>}
    </div> : <>
      <label>OpenAI API key<input autoComplete="off" type="password"
        placeholder={data.preferences.apiKeyConfigured ? 'Key saved on this PC' : 'Enter an API key'}
        value={apiKey} onChange={event => setKey(event.target.value)} /></label>
      <label>Model<input required value={model} onChange={event => setModel(event.target.value)} /></label>
    </>}
    <hr />
    <h3>Windows alerts</h3>
    <button type="button" className="button secondary"
      onClick={() => quietly(run('settings.enableWindowsAlerts', undefined).then(() => notify('Orbit is registered for Windows alerts.')))}>
      {data.preferences.windowsAlertsEnabled ? 'Test Windows alert' : 'Enable Windows alerts'}
    </button>
    <hr />
    <h3>Drive attachments</h3>
    <label>Drive access token<input autoComplete="off" type="password" placeholder={data.preferences.driveConfigured ? 'Token saved on this PC' : 'Optional OAuth access token'} value={driveToken} onChange={event => setDriveToken(event.target.value)} /></label>
    <hr />
    <h3>Discord reporting</h3>
    <div className="form-row"><label>Server ID<input value={discordGuild} inputMode="numeric" onChange={event => setDiscordGuild(event.target.value)} /></label>
      <label>Your Discord user ID<input value={discordInviter} inputMode="numeric" onChange={event => setDiscordInviter(event.target.value)} /></label></div>
    <label>Discord bot token<input autoComplete="off" type="password" placeholder={data.preferences.discordConfigured ? 'Token saved on this PC' : 'Optional bot with invite access'} value={discordToken} onChange={event => setDiscordToken(event.target.value)} /></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="button primary" type="submit">Save settings</button>
  </form>
}
