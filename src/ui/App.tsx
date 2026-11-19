import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, CalendarDays, ChevronDown, CirclePlus, House, Images, PanelLeft, PanelRight, Plus, RotateCw, Settings2, X } from 'lucide-react'
import { createPreview } from './preview'
import { Agent } from './Agent'
import { AgentDivider } from './AgentDivider'
import { Home, PlatformMark, headlineMetrics } from './Home'
import { AccountTree } from './AccountTree'
import { Analytics, Calendar, MediaLibrary, PostDetails, Composer, Preferences } from './Screens'
import { metricName, platformName, statusName } from './types'
import type { Account, AccountTab, Area, Bounds, Draft, Operations, OrbitBridge, Platform, Post, Report, Workspace } from './types'

const preview = !window.orbit
const bridge = window.orbit || createPreview()
const loadModels = () => bridge.request('agent.models', undefined)
const platforms = ['facebook', 'reddit', 'x', 'tumblr'] as const
const empty: Workspace = { accounts: [], drafts: [], jobs: [], media: [], reports: [], observations: [], messages: [], preferences: { agentModel: 'gpt-5.4-mini' } }
const navigation = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', Icon: ChartNoAxesCombined },
  { id: 'media', label: 'Media', Icon: Images },
] satisfies { id: Exclude<Area, 'site'>; label: string; Icon: typeof House }[]

type Modal =
  | { kind: 'accounts' }
  | { kind: 'metrics' }
  | { kind: 'preferences' }
  | { kind: 'compose'; at?: string; draft?: Draft }
  | { kind: 'post'; id: string }
  | null

export type Run = <K extends keyof Operations>(key: K, input: Operations[K][0]) => Promise<Operations[K][1]>

function Brand({ big = false, compact = false }: { big?: boolean; compact?: boolean }) {
  return <span className={big ? 'brand brand-hero' : 'brand'}>
    <span className="brand-mark" aria-hidden="true"><i /><i /></span>
    {!compact && <span className="wordmark">Orbit<span>.</span></span>}
  </span>
}

function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  return <dialog ref={ref} className="modal" aria-label={title} onCancel={event => { event.preventDefault(); close() }}>
    <header><h2>{title}</h2><button autoFocus className="icon-button" aria-label="Close dialog" onClick={close}><X size={19} /></button></header>
    <div className="modal-body">{children}</div>
  </dialog>
}

function MetricPins({ data, save }: { data: Workspace; save: (keys: string[]) => Promise<void> }) {
  const available = data.reports.at(-1)?.metrics || []
  const [slots, setSlots] = useState(() => {
    const pins = headlineMetrics(data).map(metric => metric.key)
    return Array.from({ length: 4 }, (_, index) => pins[index] || '')
  })
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try { await save(slots.filter(Boolean)) }
    catch { setSaving(false) }
  }

  return <form className="form metric-pin-form" onSubmit={submit}>
    <p className="muted">Choose up to four totals for Home.</p>
    {slots.map((key, index) => <label key={index}>Metric {index + 1}
      <select value={key} disabled={saving} onChange={event => {
        const value = event.target.value
        setSlots(current => current.map((item, slot) => slot === index ? value : item))
      }}>
        <option value="">None</option>
        {available.map(metric => <option key={metric.key} value={metric.key}
          disabled={metric.key !== key && slots.includes(metric.key)}>{metricName(metric)}</option>)}
      </select>
    </label>)}
    <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save metrics'}</button>
  </form>
}

function AccountPicker({ accounts, open, add }: { accounts: Account[]; open: (account: Account) => void; add: (platform: Platform, label: string) => Promise<void> }) {
  const [platform, setPlatform] = useState<Platform>('reddit')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || !label.trim()) return
    setSaving(true)
    try { await add(platform, label.trim()) } finally { setSaving(false) }
  }
  return <div className="picker">
    {accounts.length > 0 && <div className="picker-saved"><h3>Saved accounts</h3>{accounts.map(account =>
      <button type="button" className="picker-item" key={account.id} onClick={() => open(account)}>
        <PlatformMark platform={account.platform} /><span><strong>{account.label}</strong><small>{platformName[account.platform]}</small></span><ArrowRight size={16} />
      </button>)}</div>}
    <form className="form" onSubmit={submit}>
      <h3>Add account</h3>
      <div className="platform-picker" aria-label="Platform">{platforms.map(item => <button type="button" key={item}
        className={item === platform ? 'selected' : ''} aria-pressed={item === platform} onClick={() => setPlatform(item)}>
        <PlatformMark platform={item} small />{platformName[item]}
      </button>)}</div>
      <label>Account label<input autoComplete="off" maxLength={80} placeholder="e.g. u/yourhandle" value={label} onChange={event => setLabel(event.target.value)} required /></label>
      <button className="button primary" type="submit" disabled={!label.trim() || saving}><Plus size={16} /> {saving ? 'Opening…' : 'Add and open sign-in'}</button>
    </form>
  </div>
}

export function App() {
  const [data, setData] = useState<Workspace>(empty)
  const [area, setArea] = useState<Area>('home')
  const [activeId, setActiveId] = useState('')
  const [activeTab, setActiveTab] = useState('')
  const [sidebar, setSidebar] = useState(true)
  const [agent, setAgent] = useState(false)
  const [pointerPanelMotion, setPointerPanelMotion] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [selectedReport, setSelectedReport] = useState('')
  const [quickPost, setQuickPost] = useState('')
  const [notice, setNotice] = useState<{ text: string; error: boolean }>()
  const [ready, setReady] = useState(false)
  const [reporting, setReporting] = useState(false)
  const desktop = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const noticeTimeout = useRef<number>(0)
  const readSequence = useRef(0)
  const initialNoticeShown = useRef(false)

  const flash = useCallback((text: string, error = false) => {
    window.clearTimeout(noticeTimeout.current)
    setNotice({ text, error })
    noticeTimeout.current = window.setTimeout(() => setNotice(undefined), error ? 8500 : 3600)
  }, [])
  const refresh = useCallback(async () => {
    const request = ++readSequence.current
    const value = await bridge.request('workspace.read', undefined)
    if (request === readSequence.current) setData(value)
  }, [])
  useEffect(() => {
    let mounted = true
    const off = bridge.subscribe(() => { void refresh().catch(() => {}) })
    const start = performance.now()
    let timer: number | undefined
    function finish() {
      if (!mounted) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      timer = window.setTimeout(() => setReady(true), reduced || preview ? 0 : Math.max(0, 840 - (performance.now() - start)))
    }
    void refresh().catch(error => flash(error.message, true)).finally(finish)
    return () => { mounted = false; off(); if (timer !== undefined) window.clearTimeout(timer) }
  }, [refresh, flash])

  const run: Run = useCallback(async (key, payload) => {
    try {
      const result = await bridge.request(key, payload)
      await refresh()
      return result
    } catch (error) {
      flash(error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : 'Orbit could not complete that action.', true)
      throw error
    }
  }, [refresh, flash])
  const safe = (action: Promise<unknown>) => { void action.catch(() => {}) }
  const account = area === 'site' ? data.accounts.find(item => item.id === activeId) : undefined
  const openedTab = data.openTabs?.find(item => item.id === activeTab)
  const activePost = quickPost ? data.jobs.find(item => item.id === quickPost) : undefined
  const post = modal?.kind === 'post' ? data.jobs.find(item => item.id === modal.id) : undefined

  const fit = useCallback(() => {
    const rect = frame.current?.getBoundingClientRect()
    const bounds: Bounds | undefined = rect ? {
      x: Math.round(rect.x), y: Math.round(rect.y),
      width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)),
    } : undefined
    void bridge.request('tabs.fit', { tabId: account && !modal && ready ? activeTab : null, bounds }).catch(() => {})
  }, [account, activeTab, modal, ready])
  useEffect(() => {
    const node = frame.current
    fit()
    if (!node) return
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    window.addEventListener('resize', fit)
    return () => { observer.disconnect(); window.removeEventListener('resize', fit) }
  }, [fit])
  useEffect(() => { if (account && !modal) fit() }, [account, modal, sidebar, agent, quickPost, fit])
  useEffect(() => bridge.onAccountOpened?.(id => {
    setActiveId(id); setActiveTab(id); setArea('site'); setModal(null); setQuickPost('')
  }), [])
  useEffect(() => bridge.onNotice?.(message => flash(message)), [flash])
  useEffect(() => bridge.onPostOpened?.(id => {
    setArea('calendar')
    setQuickPost('')
    setModal({ kind: 'post', id })
  }), [])
  useEffect(() => {
    if (data.launchNotice && !initialNoticeShown.current) {
      initialNoticeShown.current = true
      flash(data.launchNotice)
    }
  }, [data.launchNotice, flash])

  async function openAccount(next: Account, target?: string, handoff?: string, newTab = false) {
    const opened = await run('tabs.open', { accountId: next.id, target, newTab, handoffId: handoff })
    setArea('site'); setActiveId(next.id); setActiveTab(opened.tabId); setQuickPost(handoff || ''); setModal(null)
  }
  function selectTab(tab: AccountTab) {
    setArea('site'); setActiveId(tab.accountId); setActiveTab(tab.id); setQuickPost('')
  }
  function closeTab(id: string) {
    safe(run('tabs.close', { tabId: id }))
    if (area !== 'site' || activeTab !== id) return
    const neighbor = data.openTabs?.find(tab => tab.id !== id && tab.accountId === activeId)
    if (neighbor) selectTab(neighbor)
    else { setArea('home'); setActiveTab(''); setQuickPost('') }
  }
  const openReport = (id: string) => { setSelectedReport(id); setArea('analytics') }
  async function weeklyReport() {
    if (reporting) return
    setReporting(true)
    setArea('analytics')
    try {
      const report = await run('reports.run', undefined)
      openReport(report.id)
      flash('Weekly report saved.')
    } catch { setArea('analytics') }
    finally { setReporting(false) }
  }
  const hasReports = data.reports.length > 0
  const visibleReport: Report | undefined = data.reports.find(item => item.id === selectedReport) || data.reports.at(-1)

  return <div ref={desktop} data-acrylic={data.desktopAcrylic ? '' : undefined}
    className={'desktop' + (sidebar ? '' : ' sidebar-closed') + (agent ? ' agent-open' : '') + (pointerPanelMotion ? ' panel-motion' : '')}>
    {data.desktopAcrylic && <div className="window-caption" aria-hidden="true">Orbit</div>}
    <aside className="sidebar" id="orbit-sidebar" aria-label="Workspace">
      <div className="sidebar-top"><Brand compact={!sidebar} /></div>
      <div className="sidebar-stack">
        <div className="workspace-name">
          <span className="workspace-avatar">O</span>
          {sidebar && <span><strong>My workspace</strong><small>Local workspace</small></span>}
        </div>
        <nav className="main-nav" aria-label="Orbit pages">
          {navigation.map(({ id, label, Icon }) => <button key={id} type="button" title={sidebar ? undefined : label}
            aria-current={area === id ? 'page' : undefined} aria-label={label} onClick={() => setArea(id)}>
            <Icon size={19} />{sidebar && <span>{label}</span>}
          </button>)}
        </nav>
        <div className="navigation-divider" />
        <div className="sidebar-subhead">{sidebar && <span>Accounts</span>}
          <button className="icon-button" title="New Tab" aria-label="New Tab" onClick={() => setModal({ kind: 'accounts' })}><Plus size={18} /></button>
        </div>
        <AccountTree accounts={data.accounts} tabs={data.openTabs || []} selected={area === 'site' ? activeTab : ''}
          expanded={sidebar} expandSidebar={() => { setPointerPanelMotion(true); setSidebar(true) }}
          openAccount={(item, newTab) => safe(openAccount(item, undefined, undefined, newTab))}
          selectTab={selectTab} reloadTab={tab => safe(run('tabs.reload', { tabId: tab.id }))} closeTab={closeTab} />
      </div>
      <div className="sidebar-bottom">
        <button className="sidebar-settings" aria-label="Settings" onClick={() => setModal({ kind: 'preferences' })}><Settings2 size={19} />{sidebar && <span>Settings</span>}</button>
        {sidebar && <span className="local-status"><i />{preview ? 'Browser preview' : 'On this PC'}</span>}
      </div>
    </aside>

    <main className="workspace" data-page={area}>
      <header className="workspace-top">
        <button type="button" className="icon-button pane-toggle sidebar-toggle" title={sidebar ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={sidebar ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={sidebar} aria-controls="orbit-sidebar"
          onClick={event => {
            setPointerPanelMotion(event.detail > 0)
            setSidebar(open => !open)
          }}><PanelLeft size={17} strokeWidth={1.6} /></button>
        <div className="breadcrumb">
          {account ? <><PlatformMark platform={account.platform} small /> <strong>{account.label}</strong></>
            : <><span>Workspace</span><ChevronDown size={13} className="breadcrumb-chevron" /><strong>{navigation.find(item => item.id === area)?.label}</strong></>}
        </div>
        <div className="top-actions">
          {area === 'home' && hasReports && <button className="button primary" onClick={() => safe(weeklyReport())} disabled={reporting}>
            <ChartNoAxesCombined size={16} />{reporting ? 'Preparing report…' : 'Run weekly report'}
          </button>}
          <button type="button" className="icon-button pane-toggle agent-toggle" title={agent ? 'Close Agent' : 'Open Agent'}
            aria-label={agent ? 'Close Agent' : 'Open Agent'} aria-expanded={agent} aria-controls="orbit-agent"
            onClick={event => {
              setPointerPanelMotion(event.detail > 0)
              setAgent(open => !open)
            }}>
            <PanelRight size={17} strokeWidth={1.6} />
          </button>
        </div>
      </header>
      {area === 'site' && account ? <div className="browser">
        <div className="browser-toolbar">
          <button className="icon-button" aria-label="Back in tab" onClick={() => safe(bridge.request('tabs.back', { tabId: activeTab }))}><ArrowLeft size={18} /></button>
          <button className="icon-button" aria-label="Reload tab" onClick={() => safe(bridge.request('tabs.reload', { tabId: activeTab }))}><RotateCw size={16} /></button>
          <span>{platformName[account.platform]} <span className="muted">· {account.label}</span></span>
          {!preview && <button className="button secondary" onClick={() => { setQuickPost(''); setModal({ kind: 'compose' }) }}><Plus size={15} /> Draft</button>}
          <button className="icon-button" aria-label="Close tab" onClick={() => closeTab(activeTab)}><X size={16} /></button>
        </div>
        {activePost && <div className="handoff">
          <span><strong>{statusName[activePost.status]}</strong> · {activePost.target}</span>
          <button className="button secondary" onClick={() => safe(run('clipboard.copy', { text: activePost.text }).then(() => flash('Caption copied.')))}>Copy caption</button>
          {activePost.media.map(item => <button className="button secondary" key={item.id} onClick={() => safe(run('media.open', { id: item.id }))}>{item.label}</button>)}
          <button className="button primary" onClick={() => setModal({ kind: 'post', id: activePost.id })}>Record publication</button>
        </div>}
        <div className="browser-frame" ref={frame}>
          {openedTab?.failure ? <div className="empty browser-failure" role="status">
            <PlatformMark platform={account.platform} /><h2>{platformName[account.platform]} didn’t load</h2>
            <p>{openedTab.failure}</p>
            <button className="button secondary" onClick={() => safe(run('tabs.reload', { tabId: activeTab }))}>
              <RotateCw size={15} /> Retry
            </button>
          </div> : preview && <div className="empty"><PlatformMark platform={account.platform} /><h2>{account.label}</h2>
            <p>Open Orbit on Windows to sign in and use this saved account.</p></div>}
        </div>
      </div> : <div className="workspace-scroll" key={area}>
        {area === 'home' && <Home data={data} showReport={openReport} openPost={id => setModal({ kind: 'post', id })}
          openCalendar={() => setArea('calendar')} openAnalytics={() => setArea('analytics')}
          editMetrics={() => setModal({ kind: 'metrics' })} />}
        {area === 'calendar' && <Calendar data={data} preview={preview} compose={(at, draft) => setModal({ kind: 'compose', at, draft })}
          selectPost={id => setModal({ kind: 'post', id })} run={run} notify={flash} />}
        {area === 'analytics' && <Analytics data={data} report={visibleReport} run={run} reporting={reporting}
          start={weeklyReport} select={setSelectedReport} notify={flash} />}
        {area === 'media' && <MediaLibrary data={data} run={run} notify={flash} />}
      </div>}
      {notice && <div className={'notice ' + (notice.error ? 'error' : '')} role={notice.error ? 'alert' : 'status'}>
        {notice.text}<button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice(undefined)}><X size={15} /></button>
      </div>}
    </main>

    <div className="agent-slot" inert={!agent} aria-hidden={!agent}>
      <AgentDivider desktopRef={desktop} preferredWidth={data.preferences.agentWidth}
        onResize={() => setPointerPanelMotion(false)}
        onCommit={width => safe(run('layout.saveAgentWidth', { width }))} />
      <Agent data={data} account={account} open={agent} canLoadModels={agent && !modal && (preview || Boolean(data.preferences.agentConfigured))}
        loadModels={loadModels} run={run} settings={() => setModal({ kind: 'preferences' })} />
    </div>

    {modal && <Dialog title={modal.kind === 'accounts' ? 'New Tab' : modal.kind === 'preferences' ? 'Settings' : modal.kind === 'compose' ? 'Draft post' : modal.kind === 'metrics' ? 'Headline metrics' : 'Calendar entry'} close={() => setModal(null)}>
      {modal.kind === 'accounts' && <AccountPicker accounts={data.accounts} open={item => safe(openAccount(item, undefined, undefined, true))} add={async (platform, label) => {
        try { await openAccount(await run('accounts.add', { platform, label })) } catch { /* The workspace reports the error. */ }
      }} />}
      {modal.kind === 'preferences' && <Preferences data={data} run={run} notify={flash} />}
      {modal.kind === 'metrics' && <MetricPins data={data} save={async keys => {
        await run('home.saveHeadlineMetrics', { keys })
        setModal(null)
      }} />}
      {modal.kind === 'compose' && <Composer data={data} initialAt={modal.at} draft={modal.draft} run={run}
        addAccount={() => setModal({ kind: 'accounts' })} done={message => { setModal(null); setArea('calendar'); flash(message) }} />}
      {modal.kind === 'post' && post && <PostDetails data={data} post={post} run={run} notify={flash}
        handoff={item => {
          const selected = data.accounts.find(entry => entry.id === item.accountId)
          if (selected) safe(openAccount(selected, item.handoffUrl || item.target, item.id))
        }} />}
    </Dialog>}

    <div className={'launch ' + (ready ? 'launch-done' : '')} aria-hidden="true"><Brand big /></div>
  </div>
}
