import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, ArrowUp, ChevronDown, Command, History, RotateCw, Search, Settings2, SquarePen } from 'lucide-react'
import { PlatformMark } from './Home'
import type { Run } from './App'
import type { Account, Message, Workspace } from './types'

type ModelList = { state: 'loading' } | { state: 'ready'; models: string[] } | { state: 'error'; message: string }
type ChatSummary = { id: string; title: string; date: string }
const chatDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' })

function summarizeChats(messages: Message[]) {
  const chats = new Map<string, ChatSummary>()
  for (const message of messages) {
    const chat = chats.get(message.chatId) || { id: message.chatId, title: '', date: '' }
    if (!chat.title && message.role === 'user') chat.title = message.text.trim().replace(/\s+/g, ' ')
    if (message.createdAt && message.createdAt > chat.date) chat.date = message.createdAt
    chats.set(chat.id, chat)
  }
  return [...chats.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function Agent({ data, account, open, canLoadModels, loadModels, run, settings }: {
  data: Workspace
  account?: Account
  open: boolean
  canLoadModels: boolean
  loadModels: () => Promise<string[]>
  run: Run
  settings: () => void
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [changingChat, setChangingChat] = useState(false)
  const [changingModel, setChangingModel] = useState('')
  const [modelList, setModelList] = useState<ModelList>({ state: 'loading' })
  const [modelRetry, setModelRetry] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [query, setQuery] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const history = useRef<HTMLDivElement>(null)
  const historySearch = useRef<HTMLInputElement>(null)
  const mode = data.preferences.agentMode || 'api-key'
  const chatId = data.preferences.chatId || 'first'
  const message = drafts[chatId] || ''
  const savedChats = useMemo(() => summarizeChats(data.messages), [data.messages])
  const currentTitle = savedChats.find(chat => chat.id === chatId)?.title || 'New chat'
  const unsent = Object.keys(drafts).filter(id => drafts[id].trim() && !savedChats.some(chat => chat.id === id))
    .map(id => ({ id, title: 'Unsent draft', date: '' }))
  const matchingChats = [...unsent, ...savedChats]
    .filter(chat => (chat.title || 'Chat').toLowerCase().includes(query.trim().toLowerCase()))
  const chosen = data.agentChat?.models[mode]
  const inherited = data.agentChat?.defaultModel || data.preferences.agentModel
  const available = modelList.state === 'ready' ? modelList.models : []
  const current = chosen || (mode === 'chatgpt' && !available.includes(inherited) ? available[0] || inherited : inherited)
  const unavailable = modelList.state === 'ready' && !available.includes(current)
  const busy = pending || changingChat || Boolean(changingModel)
  const messages = data.messages.filter(item => item.chatId === chatId)

  useEffect(() => {
    if (!canLoadModels) return
    let cancelled = false
    setModelList({ state: 'loading' })
    void loadModels().then(
      models => { if (!cancelled) setModelList({ state: 'ready', models }) },
      error => {
        const message = error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : 'Could not load models.'
        if (!cancelled) setModelList({ state: 'error', message })
      },
    )
    return () => { cancelled = true }
  }, [canLoadModels, loadModels, mode, modelRetry, data.preferences.agentModel])

  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight }, [messages.length, pending, chatId, data.agentActivity])
  useEffect(() => { if (!open && history.current?.matches(':popover-open')) history.current.hidePopover() }, [open])

  function setMessage(text: string) {
    setDrafts(items => ({ ...items, [chatId]: text }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!message.trim() || busy) return
    const draft = message
    setPending(true)
    try {
      await run('agent.send', { text: draft.trim(), activeAccountId: account?.id })
      setDrafts(items => items[chatId] === draft ? { ...items, [chatId]: '' } : items)
    } catch { /* The workspace reports the error. */ }
    finally { setPending(false) }
  }

  async function changeModel(model: string) {
    setChangingModel(model)
    try { await run('agent.setModel', { chatId, mode, model }) }
    catch { setModelRetry(value => value + 1) }
    finally { setChangingModel('') }
  }

  async function openChat(id?: string) {
    if (busy) return
    setChangingChat(true)
    try {
      if (id === undefined) await run('agent.newChat', undefined)
      else if (id !== chatId) await run('agent.selectChat', { chatId: id })
      if (history.current?.matches(':popover-open')) history.current.hidePopover()
      composer.current?.focus({ preventScroll: true })
    } catch { /* The workspace reports the error. */ }
    finally { setChangingChat(false) }
  }

  return <section className="agent" id="orbit-agent" aria-label="Agent">
    <header className="agent-header">
      <div className="agent-title"><span className="agent-mark" aria-hidden="true" /><strong>Agent</strong></div>
      <button type="button" className="icon-button agent-history-button" title="Previous chats" aria-label="Previous chats"
        aria-expanded={historyOpen} popoverTarget="orbit-chat-history"><History size={17} strokeWidth={1.7} /></button>
      <button type="button" className="icon-button" title="New chat" aria-label="New chat" disabled={busy}
        onClick={() => { void openChat() }}><SquarePen size={16} strokeWidth={1.7} /></button>
    </header>
    <div className="chat-history" id="orbit-chat-history" popover="auto" ref={history} aria-label="Previous chats" role="region"
      onToggle={event => {
        const shown = event.currentTarget.matches(':popover-open')
        setHistoryOpen(shown)
        if (shown) historySearch.current?.focus({ preventScroll: true })
        else setQuery('')
      }}>
      <strong>Previous chats</strong>
      <label className="chat-search"><Search size={14} /><input ref={historySearch} aria-label="Search chats"
        placeholder="Search chats" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="chat-history-list">
        {matchingChats.map(chat => <button type="button" key={chat.id} className="chat-history-row"
          aria-current={chat.id === chatId ? 'true' : undefined} title={chat.title || 'Chat'} disabled={busy}
          onClick={() => { void openChat(chat.id) }}>
          <span>{chat.title || 'Chat'}</span>
          {Number.isFinite(Date.parse(chat.date)) && <time dateTime={chat.date}>{chatDate.format(new Date(chat.date))}</time>}
        </button>)}
        {!matchingChats.length && <p>{query.trim() ? 'No matching chats.' : 'Your chats will appear here.'}</p>}
      </div>
    </div>
    <div className="agent-context">
      <strong title={currentTitle}>{currentTitle}</strong>
      <i aria-hidden="true" />
      {account ? <><PlatformMark platform={account.platform} small />{account.label}</> : <><Command size={12} /> Workspace</>}
    </div>
    <div className="chat-log" ref={log} role="log" aria-live="polite">
      {!messages.length && !pending && <div className="chat-intro">
        <h2>Ask Orbit</h2>
        <button onClick={() => setMessage('Show my upcoming posts.')}>Show my upcoming posts <ArrowRight size={15} /></button>
        <button onClick={() => setMessage('Run the weekly engagement report.')}>Run the weekly report <ArrowRight size={15} /></button>
        {!data.preferences.agentConfigured && <button className="agent-setup" onClick={settings}>Configure agent <Settings2 size={15} /></button>}
      </div>}
      {messages.map(item => <article key={item.id} className={'chat-message ' + item.role}>
        <header>{item.role === 'assistant' ? <span className="agent-mark" aria-hidden="true" /> : <span className="chat-user-mark" aria-hidden="true">Y</span>}
          <strong>{item.role === 'assistant' ? 'Orbit' : 'You'}</strong>
        </header>
        {Boolean(item.activities?.length) && <details className="chat-activity">
          <summary>Workspace activity <ChevronDown size={12} /></summary>
          <ul>{item.activities?.map(activity => <li key={activity}>{activity}</li>)}</ul>
        </details>}
        <p>{item.text}</p>
      </article>)}
      {pending && <div className="chat-progress" role="status"><i aria-hidden="true" />{data.agentActivity ? data.agentActivity + '…' : 'Thinking…'}</div>}
    </div>
    <form className="chat-form" onSubmit={submit}>
      <div className="chat-composer"><textarea ref={composer} aria-label="Message the Orbit Agent" placeholder="Ask about this tab or workspace" rows={1}
        value={message} maxLength={8000} onChange={event => setMessage(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }
        }} />
      <button type="submit" className="button primary" aria-label="Send message"
        disabled={busy || !message.trim()}><ArrowUp size={16} /></button></div>
      {modelList.state === 'error' && canLoadModels
        ? <button type="button" className="agent-model agent-model-button" onClick={() => setModelRetry(value => value + 1)}
            aria-label="Retry loading models" title={modelList.message}><RotateCw size={12} /> Retry models</button>
        : <select className="agent-model" aria-label="Chat model" title={current}
            value={changingModel || current} disabled={busy || !canLoadModels || !available.length}
            onChange={event => { void changeModel(event.currentTarget.value) }}>
            {!available.includes(current) && <option value={current} disabled={unavailable}>
              {current}{unavailable ? ' (unlisted)' : ''}
            </option>}
            {available.map(model => <option key={model} value={model}>{model}</option>)}
          </select>}
    </form>
  </section>
}
