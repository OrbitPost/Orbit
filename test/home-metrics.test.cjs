'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const views = { key: 'facebook.page.views', platform: 'facebook', label: 'Facebook Page views' };
const members = { key: 'discord.members', platform: 'discord', label: 'Discord members' };

function report(id, start, end, value, details = views) {
  return {
    id, periodStart: start + 'T00:00:00+07:00', periodEnd: end + 'T23:59:59+07:00',
    metrics: [{ ...details, checkedAt: end + 'T23:59:59+07:00', value }]
  };
}

test('Home preserves actual observations and only joins equal known reporting windows', async () => {
  const { metricHistory, metricChange } = await import('../src/ui/home-metrics.mjs');
  const short = report('short', '2026-11-01', '2026-11-04', 0);
  const long = report('long', '2026-11-06', '2026-11-15', 126);
  const next = report('next', '2026-11-16', '2026-11-25', 139);
  const carried = { ...next, id: 'carried', metrics: [{ ...next.metrics[0], stale: true }] };
  const history = metricHistory([short, long, next, carried], views.key);
  assert.deepEqual(history.map(row => [row.report.id, row.metric.value, row.connects]),
    [['short', 0, false], ['long', 126, false], ['next', 139, true]]);
  assert.equal(metricChange(history.slice(0, 2), long), null);
  assert.equal(metricChange(history, next), 13);
  assert.equal(metricChange(history, carried), null);
});

test('Home compares snapshots across different dates and excludes changed coverage or estimates', async () => {
  const { metricHistory, metricChange } = await import('../src/ui/home-metrics.mjs');
  const first = report('a', '2026-11-01', '2026-11-04', 63, members);
  const second = report('b', '2026-11-06', '2026-11-15', 65, members);
  const estimate = report('c', '2026-11-16', '2026-11-30', 151, { ...members, label: 'Discord members (approximate)' });
  const newScope = report('d', '2026-12-01', '2026-12-04', 199, { ...members, coverage: 'Different server' });
  const history = metricHistory([first, second, estimate, newScope], members.key);
  assert.deepEqual(history.map(row => row.connects), [false, true, false, false]);
  assert.equal(metricChange(history.slice(0, 2), second), 2);
});

test('Home leaves unknown collection windows and changed source URLs incomparable', async () => {
  const { metricHistory } = await import('../src/ui/home-metrics.mjs');
  const channel = { ...views, key: 'postiz.channel.views' };
  const a = report('a', '2026-11-01', '2026-11-04', 10, channel);
  const b = report('b', '2026-11-06', '2026-11-09', 12, channel);
  assert.equal(metricHistory([a, b], channel.key).at(-1).connects, false);
  const page = report('c', '2026-11-01', '2026-11-04', 10, { ...views, url: 'https://www.facebook.com/page-one' });
  const otherPage = report('d', '2026-11-06', '2026-11-09', 12, { ...views, url: 'https://www.facebook.com/page-two' });
  assert.equal(metricHistory([page, otherPage], views.key).at(-1).connects, false);
});
