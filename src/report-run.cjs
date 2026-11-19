'use strict';

const windowMs = 300000;

function createReportRun(accountIds, { clock = Date.now, arm = setTimeout, cancel = clearTimeout, onUpdate = () => {} } = {}) {
  const pending = new Map();
  const missed = new Set();
  let done;
  const finished = new Promise(resolve => { done = resolve; });
  function settle(accountId, refreshed = false) {
    const source = pending.get(accountId);
    if (!source) return;
    cancel(source.timer);
    pending.delete(accountId);
    if (!refreshed) missed.add(accountId);
    onUpdate();
    if (!pending.size) done();
  }
  function add(accountId, window) {
    const deadline = clock() + windowMs;
    const timer = arm(() => settle(accountId), windowMs);
    pending.set(accountId, { accountId, window, deadline, timer });
  }
  for (const accountId of new Set(accountIds)) add(accountId, 'action');
  if (!pending.size) done();

  function act(accountId, beforeAction = () => {}) {
    const source = pending.get(accountId);
    if (!source || clock() >= source.deadline) {
      if (source) settle(accountId);
      return null;
    }
    if (source.refreshing) return null;
    beforeAction();
    if (source.window === 'action') {
      cancel(source.timer);
      add(accountId, 'sign-in');
      onUpdate();
    }
    return pending.get(accountId).deadline;
  }

  async function refresh(accountId, load) {
    const source = pending.get(accountId);
    if (source?.window !== 'sign-in' || source.refreshing || clock() >= source.deadline) {
      throw new Error('This report reconnect request has expired or is already refreshing.');
    }
    cancel(source.timer);
    source.refreshing = true;
    onUpdate();
    let refreshed = false;
    try {
      const result = await load();
      refreshed = true;
      return result;
    } finally { settle(accountId, refreshed); }
  }

  function prompts() {
    return [...pending.values()].map(({ accountId, window, deadline, refreshing }) =>
      ({ accountId, window: refreshing ? 'refreshing' : window, deadline }));
  }
  return { finished, act, refresh, prompts, missed: () => [...missed] };
}

module.exports = { createReportRun };
