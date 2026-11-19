import { platformName } from './types'
import type { Account, Draft, Media, Metric, Operations, OrbitBridge, Post, Report, Workspace } from './types'

const accounts: Account[] = [
  { id: 'fb', platform: 'facebook', label: 'Sample Page' },
  { id: 'rd', platform: 'reddit', label: 'u/sample_creator' },
  { id: 'rd2', platform: 'reddit', label: 'u/sample_team' },
  { id: 'x', platform: 'x', label: '@sample_creator' },
  { id: 'tb', platform: 'tumblr', label: 'sample-blog' },
]
const dates = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04']
const examples: [string, Metric['platform'], string, number[]][] = [
  ['facebook.page.views', 'facebook', 'Facebook Page views', [58, 83, 92, 112, 136]],
  ['x.post.views', 'x', 'X post views', [42, 65, 53, 90, 118]],
  ['reddit.community.members', 'reddit', 'Reddit members', [14, 17, 18, 22, 24]],
  ['discord.members', 'discord', 'Discord members', [51, 56, 63, 71, 71]],
  ['x.reply.views', 'x', 'X reply views', [180, 320, 280, 450, 580]],
  ['tumblr.followers', 'tumblr', 'Tumblr followers', [9, 12, 12, 15, 17]],
  ['discord.invite.uses', 'discord', 'Your invite uses', [3, 5, 5, 6, 6]],
]
const reports = dates.map((day, i): Report => ({
  id: 'preview-' + day, baseline: i === 0, periodStart: dates[Math.max(i - 1, 0)] + 'T00:00:00Z',
  periodEnd: day + 'T10:00:00Z', savedAt: day + 'T10:00:00Z', notes: 'Illustrative figures for the browser preview.',
  metrics: examples.map(([key, platform, label, figures]) => ({
    key, platform, label, value: figures[i], checkedAt: (i === 4 && platform === 'discord' ? dates[3] : day) + 'T10:00:00Z',
    delta: i === 0 ? null : figures[i] - figures[i - 1], stale: i === 4 && platform === 'discord',
    ...(platform === 'discord' && key.includes('invite') ? { coverage: 'Active invites only' } : {}),
  })),
}))
const media: Media[] = [
  { id: 'caption', kind: 'text', label: 'Newsletter caption', value: 'The October newsletter is ready to read.', createdAt: dates[4] },
  { id: 'drive', kind: 'link', label: 'Campaign Drive folder', value: 'https://drive.google.com/', createdAt: dates[4] },
]
const jobs: Post[] = [
  { id: 'p1', accountId: 'fb', target: 'Sample Page', integrationId: '', at: '2026-11-20T12:00:00Z', title: '', text: 'A look back at this month’s highlights.', media: [], status: 'prepared' },
  { id: 'p2', accountId: 'x', target: '@sample_creator', integrationId: '', at: '2026-11-21T10:30:00Z', title: '', text: 'The next project update is ready.', media: [], status: 'prepared' },
  { id: 'p3', accountId: 'tb', target: 'sample-blog', integrationId: '', at: '2026-11-23T12:00:00Z', title: '', text: 'Notes from the studio this week.', media: [], status: 'prepared' },
  { id: 'p4', accountId: 'rd', target: 'r/example_community', integrationId: '', at: '2026-11-15T10:00:00Z', title: '', text: 'Share what you’ve been working on this month.', media: [], status: 'published' },
]

const sample: Workspace = {
  accounts, drafts: [], jobs, media, reports, observations: [], messages: [], openTabs: [],
  preferences: { agentModel: 'gpt-5.4-mini' },
}

export function createPreview(): OrbitBridge {
  const data: Workspace = structuredClone(sample)
  const chats = new Map<string, NonNullable<Workspace['agentChat']>>()
  const listeners = new Set<() => void>()
  const refresh = () => listeners.forEach(listener => listener())
  const operations: { [K in keyof Operations]: (input: Operations[K][0]) => Operations[K][1] | Promise<Operations[K][1]> } = {
    'workspace.read': () => structuredClone(data),
    'home.saveHeadlineMetrics': ({ keys }) => { data.preferences.headlineMetrics = [...keys] },
    'accounts.add': input => {
      const account = { ...input, id: crypto.randomUUID() }; data.accounts.push(account); return account
    },
    'tabs.open': ({ accountId, newTab }) => {
      const tabs = data.openTabs || []
      const exists = tabs.find(tab => tab.id === accountId)
      const tabId = exists && newTab ? crypto.randomUUID() : accountId
      const account = data.accounts.find(item => item.id === accountId)
      if (!tabs.some(tab => tab.id === tabId)) data.openTabs = [...tabs, {
        id: tabId, accountId, title: account?.platform === 'tumblr' ? 'Dashboard' : account ? platformName[account.platform] + ' Home' : 'Home',
      }]
      return { tabId }
    },
    'tabs.fit': () => undefined,
    'tabs.back': () => undefined,
    'tabs.reload': () => undefined,
    'tabs.close': input => { data.openTabs = data.openTabs?.filter(tab => tab.id !== input.tabId) },
    'drafts.save': input => {
      const draft: Draft = { ...input, id: input.id || crypto.randomUUID(), updatedAt: new Date().toISOString() }
      data.drafts = [...data.drafts.filter(item => item.id !== draft.id), draft]
      return draft
    },
    'posts.plan': input => {
      const draft = data.drafts.find(item => item.id === input.draftId)
      if (!draft) throw new Error('Choose a saved draft.')
      const posts: Post[] = draft.destinations.map(destination => ({
        ...destination, id: crypto.randomUUID(), title: destination.title || draft.title, text: destination.text || draft.text,
        at: new Date(input.at + ':00+07:00').toISOString(), status: 'prepared',
        media: data.media.filter(item => draft.mediaIds.includes(item.id)),
      }))
      data.jobs.push(...posts)
      return posts
    },
    'posts.reschedule': input => {
      const post = data.jobs.find(item => item.id === input.id)
      if (!post) throw new Error('Calendar entry unavailable.')
      post.at = new Date(input.at + ':00+07:00').toISOString()
      if (post.status === 'overdue') post.status = 'scheduled'
      return post
    },
    'posts.publish': () => { throw new Error('Live publishing is available in the desktop app.') },
    'posts.edit': input => {
      const post = data.jobs.find(item => item.id === input.id)
      if (!post) throw new Error('Calendar entry unavailable.')
      post.title = input.title
      post.text = input.text
      return post
    },
    'posts.record': input => {
      const post = data.jobs.find(item => item.id === input.id)
      if (!post) throw new Error('Choose a prepared draft first.')
      post.url = input.url
      post.publishedAt = input.publishedAt
      post.status = 'published'
      return post
    },
    'posts.verify': input => {
      const post = data.jobs.find(item => item.id === input.id)
      if (!post) throw new Error('Calendar entry unavailable.')
      return post
    },
    'reports.run': () => {
      const previous = data.reports.at(-1)
      if (!previous) throw new Error('No preview report is available.')
      const metrics = new Map<string, Metric>(previous.metrics.map(metric => [metric.key, { ...metric, stale: true, delta: null }]))
      for (const metric of data.observations) {
        const prior = metrics.get(metric.key)
        if (!prior || metric.checkedAt > prior.checkedAt) metrics.set(metric.key, { ...metric, stale: false, delta: null })
      }
      const report: Report = { ...previous, id: crypto.randomUUID(), periodStart: previous.periodEnd,
        periodEnd: new Date().toISOString(), savedAt: new Date().toISOString(), baseline: false, notes: '',
        metrics: [...metrics.values()] }
      data.reports.push(report); return report
    },
    'reports.import': input => { data.observations.push(...input.rows) },
    'reports.reconnect': () => undefined,
    'media.pick': () => { throw new Error('Use the desktop app to import files from your PC.') },
    'media.save': input => {
      const item: Media = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      data.media.push(item); return item
    },
    'media.open': () => undefined,
    'media.copy': async input => {
      const item = data.media.find(entry => entry.id === input.id)
      if (item?.value) await navigator.clipboard.writeText(item.value)
    },
    'clipboard.copy': input => navigator.clipboard.writeText(input.text),
    'links.open': input => { if (new URL(input.url).protocol === 'https:') window.open(input.url, '_blank', 'noopener,noreferrer') },
    'settings.save': input => {
      data.preferences.agentModel = input.model
      data.preferences.agentMode = input.agentMode
    },
    'agent.connectChatGPT': () => { throw new Error('Open Orbit on Windows to connect ChatGPT.') },
    'agent.cancelChatGPT': () => undefined,
    'settings.enableWindowsAlerts': () => { throw new Error('Open Orbit on Windows to enable desktop alerts.') },
    'layout.saveAgentWidth': input => { data.preferences.agentWidth = input.width },
    'agent.models': () => [...new Set([data.preferences.agentModel, 'gpt-5.4', 'gpt-5.4-mini'])],
    'agent.setModel': ({ chatId, mode, model }) => {
      const chat = data.agentChat || { id: chatId, defaultModel: data.preferences.agentModel, models: {} }
      data.agentChat = { ...chat, models: { ...chat.models, [mode]: model } }
      chats.set(chatId, data.agentChat)
    },
    'agent.send': input => {
      const chatId = data.preferences.chatId || 'first'
      data.messages.push({ id: crypto.randomUUID(), chatId, role: 'user', text: input.text, createdAt: new Date().toISOString() })
      data.messages.push({ id: crypto.randomUUID(), chatId, role: 'assistant', text: 'This is the browser preview. Configure an agent key in the Windows app to use your accounts and workspace.' })
    },
    'agent.newChat': () => {
      const id = crypto.randomUUID()
      data.preferences.chatId = id
      data.agentChat = { id, defaultModel: data.preferences.agentModel, models: {} }
      chats.set(id, data.agentChat)
    },
    'agent.selectChat': ({ chatId }) => {
      data.preferences.chatId = chatId
      data.agentChat = chats.get(chatId)
    },
  }
  return {
    async request<K extends keyof Operations>(key: K, input: Operations[K][0]): Promise<Operations[K][1]> {
      const result = await operations[key](input)
      if (!['workspace.read', 'tabs.fit', 'agent.models'].includes(key)) refresh()
      return result
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
