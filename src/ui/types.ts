export type Platform = 'facebook' | 'reddit' | 'x' | 'tumblr'
export type Area = 'home' | 'calendar' | 'analytics' | 'media' | 'site'

export type Account = { id: string; platform: Platform; label: string }
export type Media = {
  id: string
  kind: 'image' | 'video' | 'text' | 'link' | 'drive'
  label: string
  value?: string
  fileName?: string
  createdAt: string
}
export type Destination = {
  accountId: string
  target: string
  integrationId: string
  handoffUrl?: string
  text?: string
  title?: string
}
export type Draft = {
  id: string
  text: string
  title: string
  mediaIds: string[]
  destinations: Destination[]
  updatedAt: string
}
export type PostStatus = 'prepared' | 'scheduled' | 'overdue' | 'sending' | 'verify' | 'published' | 'failed'
export type Post = Destination & {
  id: string
  at: string
  title: string
  text: string
  media: Media[]
  status: PostStatus
  publishedAt?: string
  url?: string
  problem?: string
  remind?: boolean
  remindedAt?: string
}
export type Metric = {
  key: string
  label: string
  platform: Platform | 'discord'
  value: number
  checkedAt: string
  periodStart?: string
  periodEnd?: string
  scope?: string
  accountId?: string
  target?: string
  metricKey?: string
  coverage?: string
  url?: string
  delta?: number | null
  stale?: boolean
}
export type Report = {
  id: string
  periodStart: string
  periodEnd: string
  savedAt: string
  notes: string
  posts?: { title: string; url: string }[]
  baseline: boolean
  metrics: Metric[]
  missedSources?: { accountId: string; platform: Platform; label: string; status: 'carried-forward' | 'unavailable' }[]
}
export type Message = {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  text: string
  createdAt?: string
  activities?: string[]
}
export type AccountTab = { id: string; accountId: string; title?: string; failure?: string }
export type AgentMode = 'api-key' | 'chatgpt'
export type AgentChat = { id: string; defaultModel: string; models: Partial<Record<AgentMode, string>> }
export type Workspace = {
  accounts: Account[]
  drafts: Draft[]
  jobs: Post[]
  media: Media[]
  reports: Report[]
  observations: Metric[]
  messages: Message[]
  agentChat?: AgentChat
  agentActivity?: string
  desktopAcrylic?: boolean
  openTabs?: AccountTab[]
  launchNotice?: string
  reportPrompts?: { accountId: string; window: 'action' | 'sign-in' | 'refreshing'; deadline: number }[]
  preferences: {
    chatId?: string
    agentModel: string
    agentMode?: AgentMode
    agentWidth?: number
    agentConfigured?: boolean
    apiKeyConfigured?: boolean
    chatGPTConnected?: boolean
    chatGPTPending?: boolean
    windowsAlertsEnabled?: boolean
    driveConfigured?: boolean
    discordConfigured?: boolean
    discordGuild?: string
    discordInviter?: string
    headlineMetrics?: string[]
    reportInterrupted?: boolean
  }
}
export type Bounds = { x: number; y: number; width: number; height: number }

export type Operations = {
  'workspace.read': [undefined, Workspace]
  'accounts.add': [{ platform: Platform; label: string }, Account]
  'tabs.open': [{ accountId: string; target?: string; newTab?: boolean; handoffId?: string }, { tabId: string }]
  'tabs.fit': [{ tabId: string | null; bounds?: Bounds }, void]
  'tabs.back': [{ tabId: string }, void]
  'tabs.reload': [{ tabId: string }, void]
  'tabs.close': [{ tabId: string }, void]
  'drafts.save': [Omit<Draft, 'id' | 'updatedAt'> & { id?: string }, Draft]
  'posts.plan': [{ draftId: string; at: string; requestId: string }, Post[]]
  'posts.reschedule': [{ id: string; at: string }, Post]
  'posts.edit': [{ id: string; title: string; text: string }, Post]
  'posts.publish': [{ id: string }, Post]
  'posts.record': [{ id?: string; accountId?: string; target?: string; url: string; publishedAt: string; text?: string; verified: boolean }, Post]
  'posts.verify': [{ id: string }, Post]
  'home.saveHeadlineMetrics': [{ keys: string[] }, void]
  'reports.run': [undefined, Report]
  'reports.import': [{ rows: Metric[]; accountId?: string; reconnect?: { identity: string } }, void]
  'reports.reconnect': [{ accountId: string; copy: boolean }, void]
  'media.pick': [undefined, Media[]]
  'media.save': [{ kind: 'text' | 'link' | 'drive'; label: string; value: string }, Media]
  'media.open': [{ id: string }, void]
  'media.copy': [{ id: string }, void]
  'clipboard.copy': [{ text: string }, void]
  'links.open': [{ url: string }, void]
  'settings.save': [{ apiKey?: string; model: string; agentMode?: AgentMode; driveToken?: string;
    discordGuild?: string; discordInviter?: string; discordToken?: string }, void]
  'agent.connectChatGPT': [undefined, void]
  'agent.cancelChatGPT': [undefined, void]
  'settings.enableWindowsAlerts': [undefined, void]
  'layout.saveAgentWidth': [{ width: number }, void]
  'agent.models': [undefined, string[]]
  'agent.setModel': [{ chatId: string; mode: AgentMode; model: string }, void]
  'agent.send': [{ text: string; activeAccountId?: string }, void]
  'agent.newChat': [undefined, void]
  'agent.selectChat': [{ chatId: string }, void]
}

export type OrbitBridge = {
  request<Key extends keyof Operations>(key: Key, payload: Operations[Key][0]): Promise<Operations[Key][1]>
  subscribe(listener: () => void): () => void
  onAccountOpened?(listener: (id: string) => void): () => void
  onPostOpened?(listener: (id: string) => void): () => void
  onNotice?(listener: (message: string) => void): () => void
}

declare global {
  interface Window {
    orbit?: OrbitBridge
  }
}

export const platformName: Record<Platform | 'discord', string> = {
  facebook: 'Facebook', reddit: 'Reddit', x: 'X', tumblr: 'Tumblr', discord: 'Discord',
}
export const statusName: Record<PostStatus, string> = {
  prepared: 'Prepared draft', scheduled: 'Scheduled', overdue: 'Overdue', sending: 'Publishing',
  verify: 'Verify publication', published: 'Published', failed: 'Failed',
}

const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', month: 'short', day: 'numeric' })
const longFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', month: 'short', day: 'numeric', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', minute: '2-digit' })
export const formatDay = (date: string) => dayFormatter.format(new Date(date))
export const formatDate = (date: string) => longFormatter.format(new Date(date))
export const formatDateRange = (start: string, end: string) => longFormatter.formatRange(new Date(start), new Date(end))
export const formatTime = (date: string) => timeFormatter.format(new Date(date))
export const formatCount = (count: number) => new Intl.NumberFormat('en-US').format(count)
export const metricName = (metric: Pick<Metric, 'label' | 'scope'>) => metric.scope ? metric.label + ' · ' + metric.scope : metric.label

export function formatLocalInput(date: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(date))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  return value('year') + '-' + value('month') + '-' + value('day') + 'T' + value('hour') + ':' + value('minute')
}
