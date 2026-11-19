'use strict';

const { randomUUID, createHash } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { metricHistory, metricChange } = require('./ui/home-metrics.mjs');

const platforms = ['facebook', 'reddit', 'x', 'tumblr'];
const collections = ['accounts', 'drafts', 'jobs', 'media', 'observations', 'reports', 'messages'];
const defaultPreferences = { id: 'workspace', agentModel: 'gpt-5.4-mini' };
const editable = ['scheduled', 'prepared', 'overdue', 'failed'];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, limit = 12000) {
  requireValue(typeof value === 'string' && value.length <= limit, 'A text field is missing or too long.');
  return value;
}

function utc(value) {
  requireValue(typeof value === 'string' && Number.isFinite(Date.parse(value)), 'Choose a valid date and time.');
  return new Date(value).toISOString();
}

function bangkokToUtc(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), 'Choose a date and time in Bangkok.');
  const at = utc(value + ':00+07:00');
  const wall = new Date(Date.parse(at) + 7 * 3600000).toISOString().slice(0, 16);
  requireValue(wall === value, 'Choose a valid Bangkok date and time.');
  return at;
}

function webUrl(value) {
  const link = new URL(text(value, 4096));
  requireValue(link.protocol === 'https:' && !link.username && !link.password, 'Use an HTTPS link.');
  return link.href;
}

function compareEngagement(previous, current) {
  const old = new Map(previous.map(row => [row.key, row]));
  const fresh = new Map(current.map(row => [row.key, row]));
  return [...new Set([...fresh.keys(), ...old.keys()])].map(key => {
    const a = old.get(key);
    const b = fresh.get(key);
    if (!b) return { ...a, delta: null, stale: true };
    const delta = typeof a?.value === 'number' && typeof b.value === 'number' ? b.value - a.value : null;
    return { ...b, delta, stale: false };
  });
}

function reconnectDeadline(promptedAt, actedAt) {
  const initial = promptedAt + 300000;
  return actedAt !== undefined && actedAt < initial ? actedAt + 300000 : initial;
}

function openWorkspace(directory) {
  mkdirSync(directory, { recursive: true });
  const file = join(directory, 'orbit.sqlite');
  const migrate = new DatabaseSync(file);
  try {
    migrate.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        body TEXT NOT NULL,
        PRIMARY KEY (collection, id)
      );
    `);
  } finally {
    migrate.close();
  }

  function use(write, operation) {
    const db = new DatabaseSync(file);
    db.exec('PRAGMA busy_timeout = 5000');
    const parse = record => record ? JSON.parse(record.body) : undefined;
    const tx = {
      one: (type, id) => parse(db.prepare('SELECT body FROM records WHERE collection = ? AND id = ?').get(type, id)),
      list: type => db.prepare('SELECT body FROM records WHERE collection = ? ORDER BY rowid').all(type).map(parse),
      put(type, record) {
        db.prepare('INSERT INTO records VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET body = excluded.body')
          .run(type, record.id, JSON.stringify(record));
        return record;
      }
    };
    try {
      if (write) db.exec('BEGIN IMMEDIATE');
      const value = operation(tx);
      if (write) db.exec('COMMIT');
      return value;
    } catch (error) {
      if (write && db.isTransaction) db.exec('ROLLBACK');
      throw error;
    } finally {
      db.close();
    }
  }

  function find(tx, kind, id) {
    const value = typeof id === 'string' ? tx.one(kind, id) : undefined;
    requireValue(value, 'This item is no longer available.');
    return value;
  }

  function read() {
    return use(false, tx => {
      const preferences = tx.one('settings', 'workspace') || defaultPreferences;
      return {
        ...Object.fromEntries(collections.map(kind => [kind, tx.list(kind)])),
        preferences,
        agentChat: tx.one('agent-chats', preferences.chatId || 'first')
      };
    });
  }

  function addAccount(input) {
    requireValue(platforms.includes(input.platform), 'Choose a supported platform.');
    const label = text(input.label || '', 80).trim();
    requireValue(label, 'Enter a label for this saved account.');
    const id = randomUUID();
    return use(true, tx => tx.put('accounts', {
      id, platform: input.platform, label, partition: 'persist:orbit-' + id, createdAt: new Date().toISOString()
    }));
  }

  function addMedia(input) {
    requireValue(['image', 'video', 'text', 'link', 'drive'].includes(input.kind), 'Choose a supported media type.');
    const label = text(input.label, 150).trim();
    requireValue(label, 'Enter a name for the item.');
    const id = input.id || randomUUID();
    const item = { id, kind: input.kind, label, createdAt: new Date().toISOString() };
    if (input.kind === 'text') item.value = text(input.value);
    else if (input.kind === 'link' || input.kind === 'drive') item.value = webUrl(input.value);
    else {
      requireValue(typeof input.fileName === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/.test(input.fileName), 'The media file could not be saved.');
      item.fileName = input.fileName;
    }
    return use(true, tx => tx.put('media', item));
  }

  function saveDraft(input) {
    const caption = text(input.text || '');
    requireValue(Array.isArray(input.destinations) && input.destinations.length <= 32, 'Choose valid destinations.');
    requireValue(Array.isArray(input.mediaIds) && input.mediaIds.length <= 12, 'Choose valid attachments.');
    return use(true, tx => {
      const existing = input.id ? find(tx, 'drafts', input.id) : undefined;
      const mediaIds = [...new Set(input.mediaIds)];
      mediaIds.forEach(id => find(tx, 'media', id));
      const destinations = input.destinations.map(destination => {
        const account = find(tx, 'accounts', destination.accountId);
        const target = text(destination.target, 200).trim();
        requireValue(target, 'Enter the exact Page, Group, subreddit, profile, or blog.');
        return {
          accountId: account.id, target, integrationId: text(destination.integrationId || '', 120),
          ...(destination.handoffUrl ? { handoffUrl: webUrl(destination.handoffUrl) } : {}),
          ...(destination.text ? { text: text(destination.text) } : {}),
          ...(destination.title ? { title: text(destination.title, 250) } : {})
        };
      });
      const uniqueness = new Set(destinations.map(item => JSON.stringify([item.accountId, item.target])));
      requireValue(uniqueness.size === destinations.length, 'Each account and destination can appear once in a draft.');
      requireValue(caption.trim() || mediaIds.length || destinations.some(item => item.text?.trim()), 'Add a caption or attachment.');
      return tx.put('drafts', {
        id: existing?.id || randomUUID(), text: caption, mediaIds, destinations,
        title: text(input.title || '', 250), updatedAt: new Date().toISOString()
      });
    });
  }

  function schedule(draftId, localAt, requestId, captures = [], expectedVersion) {
    const at = bangkokToUtc(localAt);
    if (requestId !== undefined) text(requestId, 100);
    const intent = createHash('sha256').update(JSON.stringify([draftId, at])).digest('hex');
    return use(true, tx => {
      const receipt = requestId && tx.one('receipts', requestId);
      if (receipt) {
        requireValue(receipt.intent === intent, 'This request was already used with different details.');
        return receipt.jobs.map(id => find(tx, 'jobs', id));
      }
      const draft = find(tx, 'drafts', draftId);
      requireValue(!expectedVersion || draft.updatedAt === expectedVersion, 'The draft changed while its attachments were being captured.');
      requireValue(draft.destinations.length, 'Choose at least one destination.');
      const capturedMedia = draft.mediaIds.map(id => {
        const source = find(tx, 'media', id);
        if (source.kind !== 'drive') return source;
        const capture = captures.find(item => item.originalId === id);
        requireValue(capture, 'Capture the Drive file before adding this draft to Calendar.');
        return capture;
      });
      const jobs = draft.destinations.map(destination => tx.put('jobs', {
        id: randomUUID(), draftId, ...destination, at, text: destination.text || draft.text,
        title: destination.title || draft.title, media: capturedMedia,
        status: destination.integrationId ? 'scheduled' : 'prepared',
        ...(!destination.integrationId && { remind: true }),
      }));
      if (requestId) tx.put('receipts', { id: requestId, intent, jobs: jobs.map(job => job.id) });
      return jobs;
    });
  }

  function updateJob(id, change) {
    return use(true, tx => tx.put('jobs', { ...find(tx, 'jobs', id), ...change, id }));
  }

  function reschedule(id, localAt) {
    const at = bangkokToUtc(localAt);
    return use(true, tx => {
      const job = find(tx, 'jobs', id);
      requireValue(editable.includes(job.status), 'Resolve the current publishing attempt before rescheduling.');
      return tx.put('jobs', { ...job, at, status: job.integrationId ? 'scheduled' : 'prepared',
        remind: !job.integrationId, remindedAt: undefined });
    });
  }

  function editPost(id, input) {
    return use(true, tx => {
      const job = find(tx, 'jobs', id);
      requireValue(editable.includes(job.status), 'Resolve the current publishing attempt before editing.');
      const title = text(input.title || '', 250);
      const caption = text(input.text || '');
      requireValue(caption.trim() || job.media.length, 'Add a caption or attachment.');
      return tx.put('jobs', { ...job, title, text: caption });
    });
  }

  function recordPublication(identity) {
    const link = webUrl(identity.url);
    const publishedAt = utc(identity.publishedAt);
    return use(true, tx => {
      const existing = identity.id ? find(tx, 'jobs', identity.id) : undefined;
      if (existing) {
        requireValue(['prepared', 'verify'].includes(existing.status), 'This entry cannot accept a manually recorded publication.');
      }
      const account = find(tx, 'accounts', existing?.accountId || identity.accountId);
      const target = existing?.target || text(identity.target, 200).trim();
      requireValue(target, 'Enter the publishing destination.');
      const samePublication = tx.list('jobs').find(item => item.url === link && item.id !== existing?.id);
      requireValue(!samePublication, 'This published link is already recorded.');
      return tx.put('jobs', {
        ...(existing || { id: randomUUID(), accountId: account.id, target, media: [], integrationId: '' }),
        text: existing?.text || text(identity.text || '', 12000),
        status: 'published', at: existing?.at || publishedAt, publishedAt, url: link
      });
    });
  }

  function recover(now = new Date().toISOString()) {
    const cutoff = utc(now);
    return use(true, tx => tx.list('jobs').map(job => {
      if (job.status === 'sending') return tx.put('jobs', { ...job, status: 'verify', problem: 'Orbit closed during the attempt.' });
      if (job.status === 'scheduled' && job.at <= cutoff) return tx.put('jobs', { ...job, status: 'overdue' });
      return job;
    }));
  }

  function retireProviderJobs() {
    return use(true, tx => {
      for (const job of tx.list('jobs')) {
        if (job.integrationId && ['scheduled', 'overdue', 'failed'].includes(job.status)) {
          tx.put('jobs', { ...job, integrationId: '', status: 'prepared', remind: true,
            problem: 'This post is ready to finish in its saved account.' });
        }
      }
    });
  }

  function duePreparedReminders(now = new Date().toISOString()) {
    const cutoff = utc(now);
    return use(true, tx => tx.list('jobs')
      .filter(job => job.status === 'prepared' && job.remind && !job.remindedAt && job.at <= cutoff)
      .map(job => tx.put('jobs', { ...job, remindedAt: cutoff })));
  }

  function claim(id, { now = new Date().toISOString(), immediate = false } = {}) {
    return use(true, tx => {
      const job = find(tx, 'jobs', id);
      if (!job.integrationId) return null;
      const eligible = immediate ? ['scheduled', 'overdue', 'failed'].includes(job.status)
        : job.status === 'scheduled' && job.at <= now;
      if (!eligible) return null;
      return tx.put('jobs', { ...job, status: 'sending', attemptId: randomUUID(), attemptedAt: now, problem: undefined });
    });
  }

  function finish(id, attemptId, result) {
    return use(true, tx => {
      const job = find(tx, 'jobs', id);
      if (job.attemptId !== attemptId || !['sending', 'verify'].includes(job.status)) return job;
      if (result.kind === 'published') return tx.put('jobs', {
        ...job, status: 'published', url: webUrl(result.url), publishedAt: utc(result.publishedAt)
      });
      if (result.kind === 'accepted') return tx.put('jobs', {
        ...job, status: 'verify', providerId: result.providerId, problem: 'Accepted by the provider. Waiting for a live post link.'
      });
      return tx.put('jobs', {
        ...job, status: result.kind === 'rejected' ? 'failed' : 'verify',
        problem: result.problem || 'The provider has not confirmed a live publication.'
      });
    });
  }

  function addObservations(input, accountId) {
    requireValue(Array.isArray(input) && input.length > 0 && input.length <= 500, 'Enter up to 500 metric observations.');
    return use(true, tx => input.map(row => {
      const metricKey = text(row.metricKey || row.key, 160).trim();
      const label = text(row.label, 160).trim();
      requireValue(metricKey && label && (platforms.includes(row.platform) || row.platform === 'discord'), 'Specify a metric and a supported source.');
      requireValue(typeof row.value === 'number' && Number.isFinite(row.value) && row.value >= 0, 'Enter a nonnegative metric value.');
      const checkedAt = utc(row.checkedAt);
      const start = row.periodStart && utc(row.periodStart);
      const end = row.periodEnd && utc(row.periodEnd);
      requireValue((!start && !end) || (start && end && start < end && end <= checkedAt),
        'Enter both reporting dates in order, ending at or before the check time.');
      const saved = accountId ? find(tx, 'accounts', accountId) : null;
      let key = metricKey;
      let url = row.url ? webUrl(row.url) : undefined;
      let scope;
      if (saved) {
        requireValue(saved.platform === row.platform, 'Choose the saved account that verified these figures.');
        const target = text(row.target, 120).trim();
        requireValue(target && url, 'Enter the exact destination and evidence link for the saved account.');
        if (metricKey === 'reddit.community.members') {
          requireValue(/^r\/[A-Za-z0-9_]{2,21}$/i.test(target), 'Enter the subreddit in r/community format.');
          const subreddit = target.toLowerCase();
          const source = new URL(url);
          requireValue(/(^|\.)reddit\.com$/.test(source.hostname)
            && source.pathname.toLowerCase().split('/').slice(1, 3).join('/') === subreddit,
          'The evidence link must be on the measured subreddit.');
          scope = subreddit;
          url = 'https://www.reddit.com/' + subreddit + '/';
          const unscoped = tx.one('observations', metricKey);
          if (unscoped?.url !== url) key = metricKey + ':' + subreddit;
        } else {
          const identity = createHash('sha256').update(JSON.stringify([saved.id, target.toLowerCase()])).digest('hex').slice(0, 24);
          key = metricKey + ':' + identity;
          scope = saved.label + ' · ' + target;
        }
      }
      const latest = tx.one('observations', key);
      if (latest && latest.checkedAt > checkedAt) return latest;
      return tx.put('observations', {
        id: key, key, label, platform: row.platform, value: row.value, checkedAt,
        url, scope, accountId: saved?.id, target: saved ? row.target.trim() : undefined,
        metricKey: saved ? metricKey : undefined,
        periodStart: start || undefined, periodEnd: end || undefined,
        coverage: row.coverage ? text(row.coverage, 200) : undefined
      });
    }));
  }

  function saveReport({ from, to, notes = '', posts = [], missedAccounts = [] } = {}) {
    return use(true, tx => {
      const reports = tx.list('reports');
      const prior = reports.at(-1);
      const observations = tx.list('observations');
      const oldMetrics = prior?.metrics || [];
      const old = new Map(oldMetrics.map(row => [row.key, row]));
      const periodEnd = utc(to || new Date().toISOString());
      const fresh = observations.filter(row => row.checkedAt <= periodEnd
        && (!old.has(row.key) || row.checkedAt > old.get(row.key).checkedAt));
      requireValue(oldMetrics.length || fresh.length, 'Record a verified figure before starting your first report.');
      const periodStart = utc(from || prior?.periodEnd || fresh.reduce((start, row) => row.checkedAt < start ? row.checkedAt : start, periodEnd));
      requireValue(periodStart <= periodEnd, 'Choose a reporting range in order.');
      const evidence = new Map(posts.map(item => [webUrl(item.url), {
        title: text(item.title, 250), url: webUrl(item.url)
      }]));
      for (const job of tx.list('jobs')) {
        if (job.status === 'published' && job.url && job.publishedAt > periodStart && job.publishedAt <= periodEnd) {
          evidence.set(job.url, { url: job.url, title: (job.title || job.text || job.target).slice(0, 250) });
        }
      }
      const report = {
        id: randomUUID(), periodStart, periodEnd, baseline: !prior,
        savedAt: new Date().toISOString(), notes: text(notes, 40000),
        posts: [...evidence.values()],
        metrics: compareEngagement(oldMetrics, fresh),
      };
      for (const row of report.metrics) {
        row.delta = row.stale ? null : metricChange(metricHistory([...reports, report], row.key), report);
      }
      if (missedAccounts.length) {
        report.missedSources = missedAccounts.flatMap(id => {
          const saved = tx.one('accounts', id);
          return saved ? [{ accountId: saved.id, platform: saved.platform, label: saved.label,
            status: report.metrics.some(row => row.accountId === id && row.stale) ? 'carried-forward' : 'unavailable' }] : [];
        });
      }
      return tx.put('reports', report);
    });
  }

  function appendMessage(role, value, activities = []) {
    requireValue(['user', 'assistant'].includes(role), 'Invalid message role.');
    return use(true, tx => tx.put('messages', {
      id: randomUUID(), chatId: tx.one('settings', 'workspace')?.chatId || 'first',
      role, text: text(value, 40000), createdAt: new Date().toISOString(),
      ...(activities.length && { activities })
    }));
  }

  function preferences(input) {
    return use(true, tx => {
      const existing = tx.one('settings', 'workspace') || defaultPreferences;
      return tx.put('settings', { ...existing, ...input, id: 'workspace' });
    });
  }

  function newChat() {
    return use(true, tx => {
      const existing = tx.one('settings', 'workspace') || defaultPreferences;
      const chatId = randomUUID();
      tx.put('agent-chats', { id: chatId, defaultModel: existing.agentModel, models: {} });
      tx.put('settings', { ...existing, chatId });
    });
  }

  function selectChat(chatId) {
    return use(true, tx => {
      requireValue(typeof chatId === 'string' && chatId.length > 0 && chatId.length <= 64,
        'Choose a saved chat.');
      requireValue(chatId === 'first' || tx.one('agent-chats', chatId)
        || tx.list('messages').some(message => message.chatId === chatId), 'This chat is no longer available.');
      const existing = tx.one('settings', 'workspace') || defaultPreferences;
      tx.put('settings', { ...existing, chatId });
    });
  }

  function saveChatModel({ chatId, mode, model }) {
    return use(true, tx => {
      const existing = tx.one('settings', 'workspace') || defaultPreferences;
      requireValue(chatId === (existing.chatId || 'first') && mode === (existing.agentMode || 'api-key'),
        'The chat or connection changed. Choose the model again.');
      const chat = tx.one('agent-chats', chatId) || { id: chatId, defaultModel: existing.agentModel, models: {} };
      tx.put('agent-chats', { ...chat, models: { ...chat.models, [mode]: model } });
    });
  }

  function saveHeadlineMetrics(keys) {
    requireValue(Array.isArray(keys) && keys.length <= 4 && new Set(keys).size === keys.length,
      'Choose up to four distinct headline metrics.');
    return use(true, tx => {
      const available = tx.list('reports').at(-1)?.metrics || [];
      requireValue(keys.every(key => available.some(metric => metric.key === key)), 'Choose a metric from the latest report.');
      const existing = tx.one('settings', 'workspace') || { id: 'workspace', agentModel: 'gpt-5.4-mini' };
      tx.put('settings', { ...existing, headlineMetrics: keys });
    });
  }

  return {
    read, addAccount, addMedia, saveDraft, schedule, updateJob, reschedule, editPost, recordPublication,
    recover, retireProviderJobs, duePreparedReminders, claim, finish, addObservations, saveReport, appendMessage, preferences, saveHeadlineMetrics,
    newChat, selectChat, saveChatModel
  };
}

module.exports = { openWorkspace, compareEngagement, reconnectDeadline, bangkokToUtc, webUrl, platforms };
