const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openWorkspace, compareEngagement, reconnectDeadline } = require('../src/workspace.cjs');

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'social-workspace-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const state = openWorkspace(dir);
  const first = state.addAccount({ platform: 'reddit', label: 'u/first' });
  const second = state.addAccount({ platform: 'reddit', label: 'u/second' });
  const draft = state.saveDraft({
    text: 'Original', mediaIds: [], destinations: [
      { accountId: first.id, target: 'r/one', integrationId: 'one', text: 'One' },
      { accountId: second.id, target: 'r/two', integrationId: 'two' },
    ],
  });
  return { dir, state, first, second, draft };
}

test('Agent chats keep their models per connection and new chats inherit the Settings model', t => {
  const { dir, state } = fixture(t);
  state.saveChatModel({ chatId: 'first', mode: 'api-key', model: 'gpt-5.4' });
  state.preferences({ agentMode: 'chatgpt' });
  state.saveChatModel({ chatId: 'first', mode: 'chatgpt', model: 'gpt-6-luna' });
  state.preferences({ agentWidth: 425, agentModel: 'gpt-5.4' });

  const reopened = openWorkspace(dir);
  assert.equal(reopened.read().preferences.agentWidth, 425);
  assert.deepEqual(reopened.read().agentChat, {
    id: 'first', defaultModel: 'gpt-5.4-mini', models: { 'api-key': 'gpt-5.4', chatgpt: 'gpt-6-luna' }
  });

  reopened.newChat();
  const { agentChat } = reopened.read();
  assert.notEqual(agentChat.id, 'first');
  assert.equal(agentChat.defaultModel, 'gpt-5.4');
  assert.deepEqual(agentChat.models, {});
  assert.throws(() => reopened.saveChatModel({ chatId: 'first', mode: 'chatgpt', model: 'gpt-5.4-mini' }), /chat or connection changed/);

  reopened.selectChat('first');
  assert.equal(reopened.read().agentChat.models.chatgpt, 'gpt-6-luna');
});

test('opening a previous chat supports history saved before model choices existed', t => {
  const { dir, state } = fixture(t);
  state.appendMessage('user', 'First chat');
  state.preferences({ chatId: 'legacy-chat' });
  state.appendMessage('assistant', 'Previous answer');
  state.newChat();
  assert.throws(() => state.selectChat('missing'), /no longer available/);
  state.selectChat('legacy-chat');
  const reopened = openWorkspace(dir).read();
  assert.equal(reopened.preferences.chatId, 'legacy-chat');
  assert.equal(reopened.messages.find(message => message.chatId === 'legacy-chat').text, 'Previous answer');
  state.selectChat('first');
  assert.equal(state.read().preferences.chatId, 'first');
});

test('account sessions have distinct durable identifiers', t => {
  const { dir, first, second } = fixture(t);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(openWorkspace(dir).read().accounts.map(account => account.id), [first.id, second.id]);
});

test('prepared Calendar reminders are claimed once and retirement preserves uncertain sends', t => {
  const { state, first } = fixture(t);
  const draft = state.saveDraft({ text: 'Fixture', mediaIds: [], destinations: [
    { accountId: first.id, target: 'r/one', integrationId: 'legacy' },
  ] });
  const [future] = state.schedule(draft.id, '2026-11-20T19:00');
  const [uncertain] = state.schedule(draft.id, '2026-11-20T19:00');
  const sent = state.claim(uncertain.id, { immediate: true });
  state.finish(uncertain.id, sent.attemptId, { kind: 'unknown' });
  state.retireProviderJobs();
  assert.equal(state.read().jobs.find(job => job.id === uncertain.id).status, 'verify');
  assert.deepEqual(state.duePreparedReminders('2026-11-20T11:59:59Z'), []);
  const [due] = state.duePreparedReminders('2026-11-20T12:00:00Z');
  assert.equal(due.id, future.id);
  assert.equal(due.status, 'prepared');
  assert.deepEqual(state.duePreparedReminders('2026-11-20T12:01:00Z'), []);
});

test('Home metric pins survive reopening and invalid edits preserve the previous selection', t => {
  const { dir, state } = fixture(t);
  const known = ['facebook.page.views', 'x.post.views', 'reddit.community.members', 'discord.members', 'tumblr.notes'];
  state.addObservations(known.map(key => ({
    key, label: key, platform: key.split('.')[0], value: 0, checkedAt: '2026-11-15T00:00:00Z',
  })));
  state.saveReport({ to: '2026-11-15T00:00:00Z' });
  assert.equal(state.read().preferences.headlineMetrics, undefined);
  const pins = [known[4], known[0]];
  state.saveHeadlineMetrics(pins);
  const reopened = openWorkspace(dir);
  assert.deepEqual(reopened.read().preferences.headlineMetrics, pins);
  assert.throws(() => reopened.saveHeadlineMetrics(known), /up to four/);
  assert.throws(() => reopened.saveHeadlineMetrics([known[0], known[0]]), /distinct/);
  assert.throws(() => reopened.saveHeadlineMetrics(['unknown']), /latest report/);
  assert.deepEqual(reopened.read().preferences.headlineMetrics, pins);
  reopened.saveHeadlineMetrics([]);
  assert.deepEqual(openWorkspace(dir).read().preferences.headlineMetrics, []);
});

test('scheduling freezes the copy for each destination in Bangkok time', t => {
  const { state, draft } = fixture(t);
  const jobs = state.schedule(draft.id, '2026-11-20T19:00');
  state.saveDraft({ ...draft, text: 'Edited after scheduling' });
  assert.deepEqual(state.read().jobs.map(job => job.text), ['One', 'Original']);
  assert.deepEqual(jobs.map(job => job.at), ['2026-11-20T12:00:00.000Z', '2026-11-20T12:00:00.000Z']);
});

test('a manual destination becomes a prepared draft on the calendar', t => {
  const { state, draft } = fixture(t);
  const manual = state.saveDraft({ ...draft, destinations: [{ ...draft.destinations[0], integrationId: '' }] });
  assert.equal(state.schedule(manual.id, '2026-11-20T19:00')[0].status, 'prepared');
});

test('recovering the workspace surfaces missed and unverified work', t => {
  const { dir, state, draft } = fixture(t);
  const [first, second] = state.schedule(draft.id, '2026-11-20T19:00');
  state.updateJob(first.id, { status: 'sending' });
  const reopened = openWorkspace(dir);
  reopened.recover('2026-11-20T12:01:00Z');
  assert.equal(reopened.read().jobs.find(job => job.id === first.id).status, 'verify');
  assert.equal(reopened.read().jobs.find(job => job.id === second.id).status, 'overdue');
});

test('a report compares matching metrics and preserves stale baselines', () => {
  const previous = [
    { key: 'a', value: 8, checkedAt: '2026-11-15T08:00:00Z' },
    { key: 'b', value: 2, checkedAt: '2026-11-15T08:00:00Z' },
  ];
  const current = [{ key: 'a', value: 11, checkedAt: '2026-11-18T08:00:00Z' }];
  assert.deepEqual(compareEngagement(previous, current).map(row => [row.key, row.value, row.delta, row.stale]), [
    ['a', 11, 3, false], ['b', 2, null, true],
  ]);
});

test('saved reports use comparable windows and include published evidence only within the report', t => {
  const { first, state } = fixture(t);
  const key = 'reddit.community.posts';
  const read = (checkedAt, value) => state.addObservations([{ key, platform: 'reddit', label: 'Tracked posts', checkedAt, value }]);
  assert.throws(() => state.saveReport(), /Record a verified figure/);
  read('2026-11-04T10:00:00Z', 3);
  const baseline = state.saveReport({ from: '2026-11-01T00:00:00Z', to: '2026-11-04T10:00:00Z' });
  assert.equal(baseline.baseline, true);
  assert.deepEqual(baseline.metrics.map(row => [row.key, row.value]), [[key, 3]]);
  const publication = state.recordPublication({ accountId: first.id, target: 'r/one',
    text: 'New story', url: 'https://www.reddit.com/r/one/comments/id/story/', publishedAt: '2026-11-10T10:00:00Z' });
  read('2026-11-15T10:00:00Z', 9);
  const fresh = state.saveReport({ from: '2026-11-06T00:00:00Z', to: '2026-11-15T10:00:00Z' });
  assert.equal(fresh.baseline, false);
  assert.equal(fresh.metrics[0].delta, null);
  assert.deepEqual(fresh.posts, [{ url: publication.url, title: 'New story' }]);
  const stale = state.saveReport({ from: fresh.periodEnd, to: '2026-11-20T10:00:00Z' });
  assert.equal(stale.metrics[0].checkedAt, fresh.metrics[0].checkedAt);
  assert.equal(stale.metrics[0].stale, true);
  assert.deepEqual(stale.posts, []);
});

test('account observations keep post scopes separate and deduplicate subreddit membership', t => {
  const { state, first, second } = fixture(t);
  const evidence = { platform: 'reddit', target: 'r/example_community', url: 'https://www.reddit.com/r/example_community/',
    checkedAt: '2026-11-12T08:00:00Z' };
  const posts = { ...evidence, key: 'reddit.community.posts', label: 'Tracked posts', value: 1 };
  state.addObservations([posts], first.id);
  state.addObservations([{ ...posts, value: 4 }], second.id);
  const members = { ...evidence, key: 'reddit.community.members', label: 'Reddit members', value: 8 };
  state.addObservations([members], first.id);
  state.addObservations([members], second.id);
  const report = state.saveReport({ to: '2026-11-12T09:00:00Z' });
  assert.deepEqual(report.metrics.map(row => [row.scope, row.value]), [
    ['u/first · r/example_community', 1], ['u/second · r/example_community', 4], ['r/example_community', 8],
  ]);
  assert.throws(() => state.addObservations([{ ...members, url: 'https://www.reddit.com/r/other/' }], first.id), /measured subreddit/);
  const newAccount = state.addAccount({ platform: 'reddit', label: 'u/other' });
  const fallback = state.saveReport({ to: '2026-11-13T09:00:00Z', missedAccounts: [first.id, newAccount.id] });
  assert.deepEqual(fallback.missedSources.map(source => source.status), ['carried-forward', 'unavailable']);
});

test('a reconnect starts one additional five-minute window', () => {
  assert.equal(reconnectDeadline(1000), 301000);
  assert.equal(reconnectDeadline(1000, 270000), 570000);
});
