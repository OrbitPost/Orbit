'use strict';

const { app, BrowserWindow, WebContentsView, ipcMain, dialog, clipboard, shell, safeStorage, powerMonitor, Notification } = require('electron');
const { randomUUID } = require('node:crypto');
const { existsSync, mkdirSync } = require('node:fs');
const { copyFile, unlink } = require('node:fs/promises');
const { release } = require('node:os');
const { join, extname, basename, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { openWorkspace, webUrl, bangkokToUtc } = require('./workspace.cjs');
const { createPublisher } = require('./publisher.cjs');
const { answer, isModelId, listAgentModels } = require('./agent.cjs');
const { createChatGPTConnection } = require('./chatgpt-auth.cjs');
const { createReportRun } = require('./report-run.cjs');
const { driveFileId, captureDrive } = require('./drive.cjs');
const { discordId, discordObservations } = require('./discord-report.cjs');

app.setName('Orbit');
if (process.platform === 'win32') app.setAppUserModelId(process.execPath);
if (process.env.ORBIT_DATA_DIR) {
  const profile = resolve(process.env.ORBIT_DATA_DIR);
  mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
}
const portURL = process.env.ORBIT_DEV_URL;
const dev = typeof portURL === 'string' && /^http:\/\/127\.0\.0\.1:\d+$/.test(portURL) ? portURL : '';
const entry = join(app.getAppPath(), 'dist', 'index.html');
const entryURL = pathToFileURL(entry).href;
const desktopAcrylic = process.platform === 'win32' && Number(release().split('.')[2]) >= 22621;
const origins = {
  facebook: 'https://www.facebook.com/',
  reddit: 'https://www.reddit.com/',
  x: 'https://x.com/home',
  tumblr: 'https://www.tumblr.com/dashboard',
};
const hosts = {
  facebook: ['facebook.com'], reddit: ['reddit.com'], x: ['x.com', 'twitter.com'], tumblr: ['tumblr.com']
};
const aliases = ['accounts.google.com', 'appleid.apple.com', 'login.live.com'];
const mediaExtensions = {
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.webp': 'image', '.avif': 'image',
  '.mp4': 'video', '.mov': 'video', '.webm': 'video', '.m4v': 'video'
};

let workspace;
let main;
let mediaFolder;
let worker;
let activeJob = false;
let agentBusy = false;
let agentActivity;
let activeAccountId = '';
let activeTabId = '';
let reportPromise;
let reportRun;
let expiredOnLaunch = process.argv.some(value => /^orbit:\/\/reconnect\/[a-f0-9-]{36}$/i.test(value));
const views = new Map();
const links = new Map();
const desktopNotices = new Set();

function notify() {
  if (main && !main.isDestroyed()) main.webContents.send('orbit:changed');
}

function postNotice(job, title, detail) {
  const body = job.target + ' · ' + detail;
  const showInOrbit = () => {
    if (main && !main.isDestroyed()) main.webContents.send('orbit:notice', title + ' · ' + body);
  };
  if (!Notification.isSupported()) { showInOrbit(); return; }
  const notice = new Notification({ title: 'Orbit · ' + title, body });
  desktopNotices.add(notice);
  const release = () => desktopNotices.delete(notice);
  const expiration = setTimeout(release, 120000);
  expiration.unref();
  notice.once('close', release);
  notice.once('failed', () => { release(); showInOrbit(); });
  notice.once('click', () => {
    release();
    if (main && !main.isDestroyed()) {
      if (main.isMinimized()) main.restore();
      main.focus();
      main.webContents.send('orbit:open-post', job.id);
    }
  });
  try { notice.show(); }
  catch { release(); showInOrbit(); }
}

function enableWindowsAlerts() {
  if (process.platform !== 'win32' || !Notification.isSupported()) throw new Error('Windows alerts are unavailable on this PC.');
  const folder = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  mkdirSync(folder, { recursive: true });
  const path = join(folder, 'Orbit Workspace.lnk');
  if (existsSync(path) && shell.readShortcutLink(path).appUserModelId !== process.execPath) {
    throw new Error('An existing Orbit Workspace shortcut belongs to a different installation.');
  }
  const created = shell.writeShortcutLink(path, 'create', {
    target: process.execPath, cwd: app.getAppPath(),
    args: app.isPackaged ? '' : '"' + app.getAppPath() + '"',
    appUserModelId: process.execPath, description: 'Open Orbit on demand',
  });
  if (!created) throw new Error('Windows could not register the Orbit Start Menu shortcut.');
  workspace.preferences({ windowsAlertsEnabled: true });
  new Notification({ title: 'Orbit · Windows alerts enabled', body: 'Calendar alerts appear here while Orbit is open.' }).show();
}

function account(id) {
  const saved = workspace.read().accounts.find(item => item.id === id);
  if (!saved) throw new Error('This saved account is no longer available.');
  return saved;
}

function siteURL(value, platform, allowSignin = false) {
  try {
    const url = new URL(webUrl(value));
    return hosts[platform]?.some(root => url.hostname === root || url.hostname.endsWith('.' + root))
      || allowSignin && aliases.includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

function targetURL(saved, target) {
  const exact = target ? siteURL(target, saved.platform) : null;
  if (exact) return exact;
  if (saved.platform === 'reddit' && typeof target === 'string' && /^r\/[A-Za-z0-9_]{2,21}$/i.test(target)) {
    return 'https://www.reddit.com/' + target + '/submit/';
  }
  if (saved.platform === 'x' && typeof target === 'string' && /^@[A-Za-z0-9_]+$/.test(target)) {
    return 'https://x.com/' + target.slice(1);
  }
  return origins[saved.platform];
}

function showTabFailure(view, message) {
  if (views.get(view.orbitTabId) !== view) return;
  if (view.orbitFailure === message) return;
  view.orbitFailure = message;
  view.setVisible(false);
  notify();
  const handoff = view.orbitHandoffPost && workspace.read().jobs.find(job =>
    job.id === view.orbitHandoffPost.id && job.status === 'prepared');
  if (handoff && !view.orbitNotifiedFailure) {
    view.orbitNotifiedFailure = true;
    postNotice(handoff, 'Post needs attention', 'The saved account tab could not load.');
  }
}

function navigateTab(view, url) {
  const request = (view.orbitNavigation || 0) + 1;
  view.orbitNavigation = request;
  view.orbitRequestedUrl = url;
  view.orbitFailure = undefined;
  view.orbitNotifiedFailure = false;
  notify();
  void view.webContents.loadURL(url).catch(error => {
    if (view.orbitNavigation === request && error.code !== 'ERR_ABORTED') {
      showTabFailure(view, 'The page could not load. Retry to open it in this account.');
    }
  });
}

function ensureView(saved, target, newTab = false) {
  const tabId = newTab && views.has(saved.id) ? randomUUID() : saved.id;
  let view = views.get(tabId);
  if (!view) {
    view = new WebContentsView({ webPreferences: {
      partition: saved.partition, sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true, spellcheck: false,
    } });
    const contents = view.webContents;
    contents.session.setPermissionRequestHandler((_content, _permission, callback) => callback(false));
    contents.session.setPermissionCheckHandler(() => false);
    contents.setWindowOpenHandler(({ url }) => siteURL(url, saved.platform, true)
      ? { action: 'allow', overrideBrowserWindowOptions: { webPreferences: {
        partition: saved.partition, sandbox: true, contextIsolation: true, nodeIntegration: false,
      } } }
      : { action: 'deny' });
    contents.on('will-navigate', (event, url) => { if (!siteURL(url, saved.platform, true)) event.preventDefault(); });
    contents.on('will-redirect', (event, url, _isInPlace, isMainFrame) => {
      if (siteURL(url, saved.platform, true)) return;
      event.preventDefault();
      if (isMainFrame) showTabFailure(view, 'This page redirected outside the supported sign-in sites.');
    });
    view.orbitTabId = tabId;
    view.orbitAccountId = saved.id;
    contents.on('render-process-gone', () => showTabFailure(view, 'The tab stopped responding. Retry to reopen the page.'));
    contents.on('did-start-navigation', (_event, url, inPage, mainFrame) => {
      if (!mainFrame || inPage || !siteURL(url, saved.platform, true)) return;
      view.orbitRequestedUrl = url;
      view.orbitFailure = undefined;
      notify();
    });
    contents.on('did-fail-load', (_event, code, _description, url, mainFrame) => {
      if (mainFrame && code !== -3 && (!url || url === view.orbitRequestedUrl)) {
        showTabFailure(view, 'The page could not load. Retry to open it in this account.');
      }
    });
    contents.on('did-navigate', (_event, _url, status) => {
      if (status >= 500) showTabFailure(view, 'The site returned an error. Retry when it is available.');
    });
    contents.on('did-finish-load', notify);
    contents.on('page-title-updated', notify);
    view.setVisible(false);
    main.contentView.addChildView(view);
    views.set(tabId, view);
    navigateTab(view, targetURL(saved, target));
  } else if (target || view.orbitFailure) {
    navigateTab(view, target ? targetURL(saved, target) : view.orbitRequestedUrl || origins[saved.platform]);
  }
  return view;
}

function secureFrame(frame) {
  if (!frame || !main || main.isDestroyed()) return false;
  if (dev) {
    try { return new URL(frame.url).origin === dev; } catch { return false; }
  }
  return frame.url === entryURL;
}

function fit(input) {
  const current = main.getContentBounds();
  const b = input.bounds;
  const valid = b && [b.x, b.y, b.width, b.height].every(Number.isInteger);
  activeTabId = valid && views.has(input.tabId) ? input.tabId : '';
  activeAccountId = views.get(activeTabId)?.orbitAccountId || '';
  for (const [id, view] of views) {
    if (id !== activeTabId || view.orbitFailure) { view.setVisible(false); continue; }
    const x = Math.max(0, Math.min(current.width, b.x));
    const y = Math.max(0, Math.min(current.height, b.y));
    const width = Math.max(0, Math.min(current.width - x, b.width));
    const height = Math.max(0, Math.min(current.height - y, b.height));
    view.setBounds({ x, y, width, height });
    view.setVisible(width > 0 && height > 0);
  }
}

function onlyText(input, limit = 12000) {
  if (typeof input !== 'string' || input.length > limit) throw new Error('A text field is invalid or too long.');
  return input;
}

function encrypted(value) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential encryption is unavailable.');
  const key = onlyText(value, 4096).trim();
  if (!key || /[\r\n]/.test(key)) throw new Error('Enter a valid API key.');
  return safeStorage.encryptString(key).toString('base64');
}

function secret(value) {
  return typeof value === 'string' ? safeStorage.decryptString(Buffer.from(value, 'base64')) : '';
}

const chatGPT = createChatGPTConnection({
  load() {
    const saved = secret(workspace.read().preferences.chatGPTSecret);
    return saved ? JSON.parse(saved) : null;
  },
  save(tokens, select) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential encryption is unavailable.');
    workspace.preferences({
      chatGPTSecret: safeStorage.encryptString(JSON.stringify(tokens)).toString('base64'),
      ...(select && { agentMode: 'chatgpt' }),
    });
  },
  openBrowser: url => shell.openExternal(url),
  onUpdate(message) {
    notify();
    if (message && main && !main.isDestroyed()) main.webContents.send('orbit:notice', message);
  },
});

function snapshot() {
  const data = workspace.read();
  data.desktopAcrylic = desktopAcrylic;
  data.agentActivity = agentActivity;
  const { agentSecret, chatGPTSecret, chatGPTHost, publisherSecret, publisherUrl, integrations, driveSecret, discordSecret, ...prefs } = data.preferences;
  data.preferences = { ...prefs, agentConfigured: prefs.agentMode === 'chatgpt' ? Boolean(chatGPTSecret) : Boolean(agentSecret),
    apiKeyConfigured: Boolean(agentSecret), chatGPTConnected: Boolean(chatGPTSecret), chatGPTPending: chatGPT.pending(),
    driveConfigured: Boolean(driveSecret), discordConfigured: Boolean(discordSecret) };
  data.reportPrompts = reportRun?.prompts() || [];
  if (expiredOnLaunch) data.launchNotice = 'This reconnect link has expired.';
  data.openTabs = [...views.values()].map(view => ({
    id: view.orbitTabId, accountId: view.orbitAccountId,
    title: view.webContents.getTitle().trim().slice(0, 160), failure: view.orbitFailure,
  }));
  data.accounts = data.accounts.map(accountPublic);
  return data;
}

async function agentKey(prefs, mode) {
  const useChatGPT = mode === 'chatgpt';
  if (!(useChatGPT ? prefs.chatGPTSecret : prefs.agentSecret)) throw new Error('Connect the Agent in Settings.');
  return useChatGPT ? chatGPT.credentials() : secret(prefs.agentSecret);
}

function publisher() {
  const { publisherUrl, publisherSecret } = workspace.read().preferences;
  if (!publisherUrl || !publisherSecret) return null;
  return createPublisher({ base: publisherUrl, key: secret(publisherSecret) });
}

function filePath(item) {
  if (typeof item.fileName !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/.test(item.fileName)) {
    throw new Error('This asset has no saved local file.');
  }
  return join(mediaFolder, item.fileName);
}

function mediaItem(id) {
  const data = workspace.read();
  const item = data.media.find(row => row.id === id) || data.jobs.flatMap(job => job.media).find(row => row.id === id);
  if (!item) throw new Error('That media item is unavailable.');
  return item;
}

async function pickMedia() {
  const selection = await dialog.showOpenDialog(main, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images and video', extensions: Object.keys(mediaExtensions).map(ext => ext.slice(1)) }]
  });
  if (selection.canceled) return [];
  const items = [];
  for (const path of selection.filePaths.slice(0, 24)) {
    const extension = extname(path).toLowerCase();
    if (!mediaExtensions[extension]) continue;
    const fileName = randomUUID() + extension;
    await copyFile(path, join(mediaFolder, fileName));
    items.push(workspace.addMedia({ kind: mediaExtensions[extension], label: basename(path).slice(0, 150), fileName }));
  }
  return items;
}

function validateConnections(draft) {
  if (!draft) throw new Error('This draft is unavailable.');
  if (draft.destinations.some(item => item.integrationId)) {
    throw new Error('Save this draft with Orbit’s current delivery options.');
  }
}

function saveDraft(input) {
  if (Array.isArray(input.destinations)) {
    validateConnections(input);
    for (const target of input.destinations) {
      if (target.handoffUrl && !siteURL(target.handoffUrl, account(target.accountId).platform)) {
        throw new Error('Use a handoff link on the selected account’s platform.');
      }
    }
  }
  return workspace.saveDraft(input);
}

function reschedule(id, at) {
  const job = workspace.read().jobs.find(item => item.id === id);
  if (job?.integrationId && Date.parse(bangkokToUtc(at)) <= Date.now()) {
    throw new Error('Choose a future Bangkok time, or choose Publish now.');
  }
  return workspace.reschedule(id, at);
}

async function schedule(input) {
  const data = workspace.read();
  const draft = data.drafts.find(item => item.id === input.draftId);
  validateConnections(draft);
  if (draft.destinations.some(target => target.integrationId) && Date.parse(bangkokToUtc(input.at)) <= Date.now()) {
    throw new Error('Choose a future Bangkok time or use Publish now for an eligible Calendar entry.');
  }
  const linked = data.media.filter(item => draft.mediaIds.includes(item.id) && item.kind === 'drive');
  const captures = [];
  try {
    if (linked.length) {
      const token = secret(data.preferences.driveSecret);
      for (const item of linked) captures.push(await captureDrive(item, { token, folder: mediaFolder }));
    }
    const jobs = workspace.schedule(input.draftId, input.at, input.requestId, captures, draft.updatedAt);
    const used = new Set(jobs.flatMap(job => job.media).map(item => item.id));
    for (const item of captures) if (!used.has(item.id)) await unlink(filePath(item)).catch(() => {});
    return jobs;
  } catch (error) {
    for (const item of captures) await unlink(filePath(item)).catch(() => {});
    throw error;
  }
}

async function verify(item) {
  const provider = publisher();
  if (item.status !== 'verify' || !provider || !item.providerId) {
    throw new Error('Check the destination and record its live link if it published.');
  }
  const result = await provider.verify(item);
  if (result.kind === 'published') {
    const saved = workspace.finish(item.id, item.attemptId, result);
    if (saved.status === 'published') postNotice(saved, 'Publication verified', 'A live link is saved in Calendar.');
    return saved;
  }
  return item;
}

async function work() {
  if (activeJob) return;
  activeJob = true;
  try {
    const data = workspace.read();
    const ready = workspace.duePreparedReminders();
    for (const job of ready) {
      postNotice(job, 'Post ready to finish', 'Open the saved account from Calendar.');
    }
    if (ready.length) notify();
    const candidate = data.jobs.find(job => job.status === 'verify' && job.providerId && Date.now() - Date.parse(job.attemptedAt) < 900000);
    if (candidate) {
      const result = await verify(candidate).catch(() => null);
      if (result?.status === 'published') notify();
    }
  } finally { activeJob = false; }
}

function activate(id) {
  ensureView(account(id));
  if (main && !main.isDestroyed()) {
    main.webContents.send('orbit:open-account', id);
    if (main.isMinimized()) main.restore();
    main.focus();
  }
}

function parseReconnect(value) {
  try {
    const url = new URL(value);
    const token = url.pathname.slice(1);
    if (url.protocol !== 'orbit:' || url.hostname !== 'reconnect' || !/^[a-f0-9-]{36}$/.test(token)) return;
    const entry = links.get(token);
    if (entry && entry.expiresAt > Date.now() && (!entry.run || entry.run === reportRun)) activate(entry.accountId);
    else if (main) main.webContents.send('orbit:notice', 'This reconnect link has expired.');
    else expiredOnLaunch = true;
  } catch { /* Expired or unavailable link. */ }
}

function needsSignIn(saved) {
  const url = views.get(saved.id)?.webContents.getURL();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return aliases.includes(parsed.hostname) || /\/(?:login|log-in|signin|sign-in)(?:\/|\.php|$)/i.test(parsed.pathname);
  } catch { return false; }
}

async function collectReports() {
  const initial = workspace.read();
  const checks = [];
  const { discordGuild, discordInviter, discordSecret } = initial.preferences;
  if (!initial.reports.length && !initial.observations.length && !(discordGuild && discordInviter && discordSecret)) {
    return workspace.saveReport();
  }
  if (discordGuild && discordInviter && discordSecret) {
    checks.push(discordObservations({ guildId: discordGuild, inviterId: discordInviter, token: secret(discordSecret) })
      .then(rows => { workspace.addObservations(rows); }));
  }
  const refreshSources = Promise.allSettled(checks);
  const run = createReportRun(initial.accounts.filter(needsSignIn).map(saved => saved.id), { onUpdate: notify });
  reportRun = run;
  workspace.preferences({ reportPending: true, reportInterrupted: false });
  notify();
  const results = await refreshSources;
  await run.finished;
  const failed = results.filter(item => item.status === 'rejected').length;
  return workspace.saveReport({ missedAccounts: run.missed(),
    ...(failed ? { notes: failed + ' connected source checks could not return fresh metrics.' } : {}) });
}

function runReport() {
  if (reportPromise) return reportPromise;
  reportPromise = collectReports().finally(() => {
    reportPromise = undefined;
    reportRun = undefined;
    workspace.preferences({ reportPending: false });
    notify();
  });
  return reportPromise;
}

async function pageInfo(id, tabId) {
  const saved = account(id);
  const requested = tabId && views.get(tabId);
  if (tabId && requested?.orbitAccountId !== id) return { account: saved.label, status: 'The requested tab was closed.' };
  const view = requested || ensureView(saved);
  if (view.orbitFailure) return { account: saved.label, status: view.orbitFailure };
  if (view.webContents.isLoading()) return { account: saved.label, status: 'The saved tab is still loading.' };
  const contents = view.webContents;
  const url = contents.getURL();
  if (!siteURL(url, saved.platform)) return { account: saved.label, status: 'The tab is on its sign-in page.' };
  const text = await contents.executeJavaScript('document.body ? document.body.innerText.slice(0, 8500) : ""');
  return { account: saved.label, url, title: contents.getTitle(), text };
}

const operations = {
  'workspace.read': snapshot,
  'accounts.add': input => accountPublic(workspace.addAccount(input)),
  'tabs.open': input => {
    const saved = account(input.accountId);
    const handoff = input.handoffId ? workspace.read().jobs.find(job =>
      job.id === input.handoffId && job.accountId === saved.id && job.status === 'prepared') : undefined;
    if (input.handoffId && !handoff) throw new Error('This prepared post is no longer available.');
    const target = handoff ? handoff.handoffUrl || handoff.target : input.target;
    const view = ensureView(saved, target, input.newTab === true);
    view.orbitHandoffPost = handoff;
    if (handoff) postNotice(handoff, 'Opening a prepared post', 'Finish publishing in the saved account.');
    return { tabId: view.orbitTabId };
  },
  'tabs.fit': fit,
  'tabs.back': input => { const nav = views.get(input.tabId)?.webContents.navigationHistory; if (nav?.canGoBack()) nav.goBack(); },
  'tabs.reload': input => {
    const view = views.get(input.tabId);
    if (!view) return;
    if (view.orbitFailure || !view.webContents.getURL()) {
      navigateTab(view, view.orbitRequestedUrl || origins[account(view.orbitAccountId).platform]);
    } else view.webContents.reload();
  },
  'tabs.close': input => {
    const view = views.get(input.tabId);
    if (!view) return;
    views.delete(input.tabId);
    main.contentView.removeChildView(view);
    view.webContents.close();
  },
  'drafts.save': saveDraft,
  'posts.plan': schedule,
  'posts.reschedule': input => reschedule(input.id, input.at),
  'posts.edit': input => workspace.editPost(input.id, input),
  'posts.publish': () => { throw new Error('Open the saved account to finish this post.'); },
  'posts.record': input => {
    if (input.verified !== true) throw new Error('Verify the live post and publication time before recording it.');
    const existing = input.id && workspace.read().jobs.find(item => item.id === input.id);
    const saved = account(existing ? existing.accountId : input.accountId);
    if (!siteURL(input.url, saved.platform)) throw new Error('Use a verified live link on the selected platform.');
    const job = workspace.recordPublication(input);
    postNotice(job, 'Publication recorded', 'The verified link is saved in Calendar.');
    return job;
  },
  'posts.verify': input => {
    const item = workspace.read().jobs.find(job => job.id === input.id);
    if (!item) throw new Error('That Calendar entry is unavailable.');
    return verify(item);
  },
  'home.saveHeadlineMetrics': input => workspace.saveHeadlineMetrics(input.keys),
  'reports.run': runReport,
  'reports.import': async input => {
    const saved = input.accountId ? account(input.accountId) : null;
    if (saved && (!Array.isArray(input.rows) || input.rows.some(row => row.platform !== saved.platform))) {
      throw new Error('Choose the saved account that verified these figures.');
    }
    if (saved && input.rows.some(row => !siteURL(row.url, saved.platform))) {
      throw new Error('Use a source link on the selected account’s platform.');
    }
    const add = () => workspace.addObservations(input.rows, saved?.id);
    if (!input.reconnect) {
      if (saved && reportRun?.prompts().some(prompt => prompt.accountId === saved.id)) {
        throw new Error('Confirm the signed-in identity before adding figures for this pending source.');
      }
      add();
      return;
    }
    if (!saved || !reportRun) throw new Error('This report reconnect request has expired.');
    const observedIdentity = onlyText(input.reconnect.identity, 100).trim().toLowerCase();
    const contents = views.get(saved.id)?.webContents;
    if (observedIdentity !== saved.label.toLowerCase() || !contents || contents.isLoading()
        || !siteURL(contents.getURL(), saved.platform) || needsSignIn(saved)) {
      throw new Error('Open the saved tab and verify the intended signed-in account before recording figures.');
    }
    await reportRun.refresh(saved.id, add);
  },
  'reports.reconnect': input => {
    const saved = account(input.accountId);
    const run = reportRun;
    if (!input.copy) {
      if (run && !run.act(saved.id)) throw new Error('This report reconnect request has expired.');
      activate(saved.id);
    }
    else {
      const token = randomUUID();
      const expiry = run?.act(saved.id, () => clipboard.writeText('orbit://reconnect/' + token));
      if (!expiry) throw new Error('This report reconnect request has expired.');
      for (const [old, entry] of links) if (entry.expiresAt <= Date.now()) links.delete(old);
      links.set(token, { accountId: saved.id, expiresAt: expiry, run });
    }
  },
  'media.pick': pickMedia,
  'media.save': input => {
    if (!['text', 'link', 'drive'].includes(input.kind)) throw new Error('Use the file picker to import local media.');
    if (input.kind === 'drive') driveFileId(input.value);
    return workspace.addMedia(input);
  },
  'media.open': async input => {
    const item = mediaItem(input.id);
    if (item.kind === 'link' || item.kind === 'drive') return shell.openExternal(webUrl(item.value));
    if (item.kind === 'text') { clipboard.writeText(item.value); return; }
    const error = await shell.openPath(filePath(item));
    if (error) throw new Error('Windows could not open the saved file.');
  },
  'media.copy': input => {
    const item = mediaItem(input.id);
    clipboard.writeText(item.value || filePath(item));
  },
  'clipboard.copy': input => { clipboard.writeText(onlyText(input.text, 100000)); },
  'links.open': input => shell.openExternal(webUrl(input.url)),
  'settings.save': input => {
    const model = onlyText(input.model, 100).trim();
    if (!isModelId(model)) throw new Error('Enter a valid model name.');
    const fields = { agentModel: model };
    if (input.agentMode !== undefined) {
      if (!['api-key', 'chatgpt'].includes(input.agentMode)) throw new Error('Choose a supported Agent connection.');
      fields.agentMode = input.agentMode;
    }
    if (input.apiKey) fields.agentSecret = encrypted(input.apiKey);
    if (input.driveToken) fields.driveSecret = encrypted(input.driveToken);
    if (input.discordGuild !== undefined) fields.discordGuild = input.discordGuild ? discordId(input.discordGuild.trim()) : '';
    if (input.discordInviter !== undefined) fields.discordInviter = input.discordInviter ? discordId(input.discordInviter.trim()) : '';
    if (input.discordToken) fields.discordSecret = encrypted(input.discordToken);
    workspace.preferences(fields);
  },
  'agent.connectChatGPT': async () => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential encryption is unavailable.');
    const current = workspace.read().preferences;
    const hostId = current.chatGPTHost || 'urn:uuid:' + randomUUID();
    if (!current.chatGPTHost) workspace.preferences({ chatGPTHost: hostId });
    await chatGPT.connect(hostId);
  },
  'agent.cancelChatGPT': () => chatGPT.cancel(),
  'settings.enableWindowsAlerts': enableWindowsAlerts,
  'layout.saveAgentWidth': input => {
    if (!Number.isSafeInteger(input.width) || input.width < 200 || input.width > 16384) {
      throw new Error('Choose a valid Agent panel width.');
    }
    workspace.preferences({ agentWidth: input.width });
  },
  'agent.models': async () => {
    const { preferences: prefs } = workspace.read();
    const mode = prefs.agentMode || 'api-key';
    const key = await agentKey(prefs, mode);
    return listAgentModels({ mode, key, defaultModel: prefs.agentModel });
  },
  'agent.setModel': async input => {
    if (agentBusy) throw new Error('Wait for the current reply before switching models.');
    if (!isModelId(input.model)) throw new Error('Choose a valid Agent model.');
    const { preferences: prefs } = workspace.read();
    const mode = prefs.agentMode || 'api-key';
    if (input.mode !== mode || input.chatId !== (prefs.chatId || 'first')) {
      throw new Error('The chat or connection changed. Choose the model again.');
    }
    const key = await agentKey(prefs, mode);
    const available = await listAgentModels({ mode, key, defaultModel: prefs.agentModel });
    if (!available.includes(input.model)) throw new Error('That model is unavailable. Choose another model.');
    if (agentBusy) throw new Error('Wait for the current reply before switching models.');
    if (mode === 'api-key' && workspace.read().preferences.agentSecret !== prefs.agentSecret) {
      throw new Error('The connection changed. Choose the model again.');
    }
    workspace.saveChatModel({ chatId: input.chatId, mode, model: input.model });
  },
  'agent.newChat': () => {
    if (agentBusy) throw new Error('Wait for the current reply before starting a new chat.');
    workspace.newChat();
  },
  'agent.selectChat': input => {
    if (agentBusy) throw new Error('Wait for the current reply before switching chats.');
    workspace.selectChat(input.chatId);
  },
  'agent.send': async input => {
    if (agentBusy) throw new Error('The Agent is handling your previous message.');
    const prompt = onlyText(input.text, 8000).trim();
    if (!prompt) throw new Error('Enter a message.');
    const previous = workspace.read();
    const mode = previous.preferences.agentMode || 'api-key';
    const useChatGPT = mode === 'chatgpt';
    const accountId = activeAccountId && input.activeAccountId === activeAccountId ? activeAccountId : '';
    const tabId = accountId ? activeTabId : '';
    const history = previous.messages.filter(message => message.chatId === (previous.preferences.chatId || 'first')).slice(-16);
    agentBusy = true;
    try {
      const activities = new Set();
      const key = await agentKey(previous.preferences, mode);
      const chosenModel = previous.agentChat?.models[mode];
      const defaultModel = previous.agentChat?.defaultModel || previous.preferences.agentModel;
      let model = chosenModel || defaultModel;
      if (useChatGPT) {
        const available = await listAgentModels({ mode, key });
        if (chosenModel && !available.includes(chosenModel)) throw new Error('This chat’s model is unavailable. Choose another model.');
        model = available.includes(model) ? model : available[0];
        if (!model) throw new Error('This ChatGPT connection has no available Agent model.');
      }
      workspace.appendMessage('user', prompt);
      notify();
      const response = await answer({ key, model, chatGPT: useChatGPT, prompt, history, accountId, tabId,
        snapshot, pageInfo, saveDraft, schedule, reschedule,
        saveReport: runReport,
        onActivity(label) {
          activities.add(label);
          if (agentActivity !== label) {
            agentActivity = label;
            notify();
          }
        },
      });
      workspace.appendMessage('assistant', response, [...activities]);
    } finally {
      agentActivity = undefined;
      agentBusy = false;
    }
  }
};

function accountPublic({ id, platform, label }) { return { id, platform, label }; }

function createWindow() {
  main = new BrowserWindow({
    width: 1450, height: 945, minWidth: 825, minHeight: 575, show: false, title: 'Orbit',
    autoHideMenuBar: true,
    ...(desktopAcrylic ? {
      titleBarStyle: 'hidden', titleBarOverlay: { color: '#1a1920', symbolColor: '#e5e1ed', height: 32 },
      backgroundMaterial: 'acrylic', backgroundColor: '#00000000',
    } : { backgroundColor: '#e8e2f2' }),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  main.webContents.on('will-navigate', event => event.preventDefault());
  main.once('ready-to-show', () => { if (!process.env.ORBIT_HIDDEN) main.show(); });
  main.on('closed', () => {
    for (const view of views.values()) if (!view.webContents.isDestroyed()) view.webContents.close();
    views.clear();
    main = null;
  });
  if (dev) void main.loadURL(dev).catch(() => {});
  else void main.loadFile(entry).catch(() => {});
}

if (!app.requestSingleInstanceLock(process.env.ORBIT_DATA_DIR || 'orbit')) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const link = argv.find(value => value.startsWith('orbit://'));
    if (link) parseReconnect(link);
    else if (main) { if (main.isMinimized()) main.restore(); main.focus(); }
  });
  app.on('open-url', (event, url) => { event.preventDefault(); parseReconnect(url); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { clearInterval(worker); chatGPT.cancel(); });
  app.whenReady().then(() => {
    const root = app.getPath('userData');
    mediaFolder = join(root, 'media');
    mkdirSync(mediaFolder, { recursive: true });
    workspace = openWorkspace(root);
    if (workspace.read().preferences.reportPending) workspace.preferences({ reportPending: false, reportInterrupted: true });
    workspace.recover();
    workspace.retireProviderJobs();
    if (!process.env.ORBIT_DATA_DIR) {
      if (app.isPackaged) app.setAsDefaultProtocolClient('orbit');
      else if (process.defaultApp && process.platform === 'win32') {
        app.setAsDefaultProtocolClient('orbit', process.execPath, [resolve(app.getAppPath())]);
      }
    }
    ipcMain.handle('orbit:request', async (event, operation, input) => {
      if (event.sender !== main?.webContents || event.senderFrame !== event.sender.mainFrame || !secureFrame(event.senderFrame)) {
        throw new Error('This request needs the trusted Orbit workspace.');
      }
      if (typeof operation !== 'string' || !Object.hasOwn(operations, operation)) throw new Error('Unknown Orbit operation.');
      if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) throw new Error('Invalid operation input.');
      try { return await operations[operation](input || {}); }
      finally { if (!['workspace.read', 'tabs.fit', 'tabs.open', 'agent.models'].includes(operation)) notify(); }
    });
    powerMonitor.on('resume', () => { workspace.recover(); notify(); });
    worker = setInterval(() => { void work().catch(() => {}); }, 4000);
    createWindow();
  }).catch(error => {
    dialog.showErrorBox('Orbit could not start', error.message);
    app.exit(1);
  });
}
