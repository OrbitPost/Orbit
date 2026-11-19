'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openWorkspace } = require('../src/workspace.cjs');
const { createReportRun } = require('../src/report-run.cjs');
const { createPublisher } = require('../src/publisher.cjs');
const { captureDrive, driveFileId } = require('../src/drive.cjs');
const { discordObservations } = require('../src/discord-report.cjs');
const { answer } = require('../src/agent.cjs');

function folder(testContext) {
  const directory = mkdtempSync(join(tmpdir(), 'orbit-runtime-test-'));
  testContext.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('planning and publishing claim protect against duplicate dispatch after an uncertain result', t => {
  const ws = openWorkspace(folder(t));
  const account = ws.addAccount({ platform: 'x', label: 'Demo' });
  const draft = ws.saveDraft({
    text: 'Hello there', mediaIds: [], destinations: [{ accountId: account.id, target: 'Demo', integrationId: 'one' }]
  });
  const first = ws.schedule(draft.id, '2026-11-20T19:00', 'request-1');
  assert.equal(ws.schedule(draft.id, '2026-11-20T19:00', 'request-1')[0].id, first[0].id);
  assert.throws(() => ws.schedule(draft.id, '2026-11-20T19:01', 'request-1'), /different details/);
  const claim = ws.claim(first[0].id, { immediate: true });
  assert.equal(ws.claim(first[0].id, { immediate: true }), null);
  ws.finish(claim.id, claim.attemptId, { kind: 'unknown' });
  assert.equal(ws.claim(first[0].id, { immediate: true }), null);
  assert.equal(ws.read().jobs[0].status, 'verify');
});

test('report sources get independent deadlines and repeat actions do not extend them', async () => {
  let clock = 1000;
  let serial = 0;
  const timers = new Map();
  const tracker = createReportRun(['a', 'b'], {
    clock: () => clock,
    arm: (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: clock + delay }); return id; },
    cancel: id => timers.delete(id),
  });
  function advance(at) {
    clock = at;
    for (const [id, timer] of timers) if (timer.at <= at) { timers.delete(id); timer.callback(); }
  }
  advance(241000);
  assert.equal(tracker.act('a'), 541000);
  advance(301000);
  assert.equal(tracker.act('b'), null);
  assert.equal(tracker.act('a'), 541000);
  assert.deepEqual(tracker.prompts(), [{ accountId: 'a', window: 'sign-in', deadline: 541000 }]);
  let release;
  const pendingRefresh = tracker.refresh('a', () => new Promise(resolve => { release = resolve; }));
  advance(551000);
  assert.equal(tracker.prompts()[0].window, 'refreshing');
  release();
  await pendingRefresh;
  await tracker.finished;
  assert.deepEqual(tracker.prompts(), []);
  assert.deepEqual(tracker.missed(), ['b']);
});

test('failed clipboard and expired source actions do not start a refresh', async () => {
  let now = 0;
  const tracker = createReportRun(['a'], { clock: () => now, arm: () => 1, cancel: () => {} });
  assert.throws(() => tracker.act('a', () => { throw Error('Clipboard unavailable'); }), /Clipboard unavailable/);
  assert.equal(tracker.prompts()[0].window, 'action');
  now = 300000;
  assert.equal(tracker.act('a'), null);
  await assert.rejects(tracker.refresh('a', () => assert.fail('Expired operation executed')), /expired/);
  await tracker.finished;
});

test('provider checks the exact target and confirms publication via the same returned post ID', async () => {
  let submitted;
  const publisher = createPublisher({
    base: 'https://publisher.example/public/v1', key: 'fixture-key',
    async fetcher(url, options) {
      assert.equal(options.headers.Authorization, 'fixture-key');
      if (url.endsWith('/integrations')) return Response.json([{ id: 'connection', identifier: 'x', name: 'Example Profile' }]);
      if (url.endsWith('/posts')) {
        submitted = JSON.parse(options.body);
        return Response.json([{ postId: 'provider-post', integration: 'connection' }]);
      }
      return Response.json({ posts: [{
        id: 'provider-post', integration: { id: 'connection' }, state: 'PUBLISHED',
        releaseURL: 'https://x.com/sample_creator/status/1000', publishDate: '2026-11-19T01:00:00Z'
      }] });
    }
  });
  const post = { target: 'Example Profile', integrationId: 'connection', text: 'Test', media: [], attemptedAt: '2026-11-19T01:00:00Z' };
  const denied = await publisher.submit({ ...post, target: 'Other Page' }, { platform: 'x' });
  assert.equal(denied.kind, 'rejected');
  assert.equal(submitted, undefined);
  const result = await publisher.submit(post, { platform: 'x' });
  assert.equal(result.kind, 'accepted');
  assert.equal(submitted.posts[0].integration.id, 'connection');
  assert.equal((await publisher.verify({ ...post, providerId: result.providerId })).kind, 'published');
});

test('Drive attachments require a captured file and freeze the downloaded media for a planned entry', async t => {
  const directory = folder(t);
  const ws = openWorkspace(directory);
  const account = ws.addAccount({ platform: 'tumblr', label: 'Example' });
  const media = ws.addMedia({ kind: 'drive', label: 'Banner', value: 'https://drive.google.com/file/d/valid-file-123/view' });
  const draft = ws.saveDraft({ text: 'Caption', mediaIds: [media.id], destinations: [{ accountId: account.id, target: 'Example' }] });
  assert.throws(() => ws.schedule(draft.id, '2026-11-20T19:00'), /Capture the Drive file/);
  assert.equal(ws.read().jobs.length, 0);
  assert.throws(() => driveFileId('https://example.com/file/d/valid-file-123/view'), /Google Drive/);
  const capture = await captureDrive(media, {
    token: 'fixture-token', folder: directory,
    async fetcher(url, options) {
      assert.equal(url, 'https://www.googleapis.com/drive/v3/files/valid-file-123?alt=media');
      assert.equal(options.headers.Authorization, 'Bearer fixture-token');
      return new Response('fixture data', { headers: { 'Content-Type': 'image/png' } });
    }
  });
  const [job] = ws.schedule(draft.id, '2026-11-20T19:00', 'request-1', [capture], draft.updatedAt);
  assert.equal(job.media[0].kind, 'image');
  assert.equal(readFileSync(join(directory, job.media[0].fileName), 'utf8'), 'fixture data');
});

test('Discord marks approximate members and sums only the intended inviter’s active links', async () => {
  const guildId = '123456789012345678';
  const inviterId = '123456789012345679';
  const rows = await discordObservations({ guildId, inviterId, token: 'fixture-key',
    clock: () => Date.parse('2026-11-19T07:00:00Z'),
    async fetcher(url, options) {
      assert.equal(options.headers.Authorization, 'Bot fixture-key');
      if (url.endsWith('/invites')) return Response.json([
        { inviter: { id: inviterId }, uses: 9, expires_at: '2026-11-20T07:00:00Z' },
        { inviter: { id: inviterId }, uses: 7, expires_at: '2026-11-18T07:00:00Z' },
        { inviter: { id: '123456789012345670' }, uses: 4, max_age: 0 },
      ]);
      return Response.json({ approximate_member_count: 65 });
    }
  });
  assert.deepEqual(rows.map(row => [row.label, row.value]), [['Discord members (approximate)', 65], ['Your invite uses', 9]]);
});

test('an Agent request to read all open tabs leaves unrelated saved accounts outside its scope', async () => {
  let round = 0;
  const pages = [];
  const response = await answer({
    key: 'fixture-key', model: 'fixture', prompt: 'Read all open tabs', history: [], accountId: '', tabId: '',
    snapshot: () => ({
      accounts: [{ id: 'visible', platform: 'reddit', label: 'First' }, { id: 'closed', platform: 'reddit', label: 'Second' }],
      openTabs: [{ id: 'view-1', accountId: 'visible' }],
    }),
    pageInfo(account, tab) { pages.push([account, tab]); return { text: 'Visible fixture' }; },
    async fetcher(url, options) {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const request = JSON.parse(options.body);
      if (round++ === 0) return Response.json({ output: [
        { type: 'function_call', call_id: 'open', name: 'read_visible_tab', arguments: '{"tabId":"view-1"}' },
        { type: 'function_call', call_id: 'closed', name: 'read_visible_tab', arguments: '{"tabId":"closed"}' },
      ] });
      const blocked = request.input.find(item => item.type === 'function_call_output' && item.call_id === 'closed');
      assert.match(JSON.parse(blocked.output).error, /does not cover/);
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Read the open tab.' }] }] });
    },
  });
  assert.deepEqual(pages, [['visible', 'view-1']]);
  assert.equal(response, 'Read the open tab.');
});

test('Agent actions share local scheduling and reporting and reject unconfirmed destinations', async t => {
  const ws = openWorkspace(folder(t));
  const account = ws.addAccount({ platform: 'reddit', label: 'u/fixture' });
  const media = ws.addMedia({ kind: 'text', label: 'Fixture notes', value: 'Fixture' });
  const draft = ws.saveDraft({ title: 'Launch teaser', text: 'Hello', mediaIds: [media.id],
    destinations: [{ accountId: account.id, target: 'r/example_community' }] });
  const args = { draftId: draft.id, bangkokDateTime: '2026-11-20T19:00' };
  async function turn(prompt, action, params, expected) {
    let round = 0;
    return answer({ key: 'fixture', model: 'fixture', prompt, history: [], snapshot: ws.read,
      schedule: input => ws.schedule(input.draftId, input.at, input.requestId),
      reschedule: ws.reschedule,
      saveReport: () => ws.saveReport({ to: '2026-11-21T00:00:00Z' }),
      async fetcher(_, request) {
        const body = JSON.parse(request.body);
        if (round++ === 0) return Response.json({ output: [
          { type: 'function_call', call_id: 'one', name: action, arguments: JSON.stringify(params) }
        ] });
        expected(JSON.parse(body.input.at(-1).output));
        return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Checked.' }] }] });
      },
    });
  }
  await turn('Schedule Launch teaser for tomorrow', 'plan_post', args, result => assert.match(result.error, /Confirm/));
  assert.equal(ws.read().jobs.length, 0);
  await turn('Schedule Launch teaser for u/fixture in r/example_community on 2026-11-20 19:00 Bangkok',
    'plan_post', args, result => assert.equal(result[0].status, 'prepared'));
  const entry = ws.read().jobs[0];
  assert.equal(entry.media[0].id, media.id);
  await turn('Reschedule Launch teaser for u/fixture in r/example_community on 2026-11-21 18:00 Bangkok',
    'reschedule_post', { postId: entry.id, bangkokDateTime: '2026-11-21T18:00' },
    result => assert.equal(result.at, '2026-11-21T11:00:00.000Z'));
  ws.addObservations([{ key: 'reddit.community.members', label: 'Reddit members', platform: 'reddit', value: 8, checkedAt: '2026-11-19T00:00:00Z' }]);
  await turn('Run the weekly engagement report', 'run_weekly_report', {}, result => assert.equal(result.metrics[0].value, 8));
  assert.equal(ws.read().reports.length, 1);
});
