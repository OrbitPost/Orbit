'use strict';

const { basename } = require('node:path');
const { openAsBlob } = require('node:fs');
const { webUrl } = require('./workspace.cjs');

class ProviderError extends Error {
  constructor(status) {
    super('The publishing provider returned HTTP ' + status + '.');
    this.status = status;
  }
}

function apiBase(input) {
  const url = new URL(input);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use a HTTPS Postiz API base, or an HTTP loopback address on this PC.');
  }
  return url.href.replace(/\/+$/, '');
}

function createPublisher({ base, key, fetcher = fetch }) {
  const root = apiBase(base);
  async function request(route, options = {}) {
    const response = await fetcher(root + route, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(25000),
      headers: { Authorization: key, ...options.headers },
    });
    if (!response.ok) throw new ProviderError(response.status);
    return response.json();
  }

  async function connections() {
    const rows = await request('/integrations');
    if (!Array.isArray(rows)) throw new Error('The provider returned an invalid connection list.');
    return rows.flatMap(row => {
      if (!row || typeof row !== 'object') return [];
      const platform = row.identifier === 'twitter' ? 'x' : row.identifier;
      if (row.disabled || !['facebook', 'reddit', 'x', 'tumblr'].includes(platform)
        || typeof row.id !== 'string' || typeof row.name !== 'string') return [];
      return [{ id: row.id, platform, label: row.name, handle: typeof row.profile === 'string' ? row.profile : undefined }];
    });
  }

  function settings(target, job) {
    if (target.platform === 'reddit') {
      const subreddit = job.target.match(/^r\/([A-Za-z0-9_]{2,21})$/)?.[1];
      if (!subreddit || String(job.title || '').trim().length < 2) {
        throw new Error('Automatic Reddit posts need r/subreddit as the destination and a post title.');
      }
      if (job.media.length) throw new Error('Use a prepared draft for Reddit media, links, or required flair.');
      return { __type: 'reddit', subreddit: [{ value: {
        subreddit, title: job.title.trim(), type: 'self', url: '', is_flair_required: false, flair: null
      } }] };
    }
    const label = String(job.target).trim().toLowerCase();
    const matches = [target.label, target.handle].filter(Boolean).some(name => name.trim().toLowerCase() === label);
    if (!matches) throw new Error('The destination must match the connected provider account: ' + target.label + '.');
    return { __type: target.platform };
  }

  async function submit(job, account, mediaPath) {
    let dispatchStarted = false;
    try {
      const target = (await connections()).find(item => item.id === job.integrationId && item.platform === account.platform);
      if (!target) return { kind: 'rejected', problem: 'The authorized connection is unavailable. Refresh connections in Settings.' };
      const providerSettings = settings(target, job);
      const files = [];
      let caption = job.text;
      for (const media of job.media) {
        if (media.kind === 'text' || media.kind === 'link') {
          caption += (caption ? '\n\n' : '') + media.value;
          continue;
        }
        const path = mediaPath(media);
        const form = new FormData();
        form.set('file', await openAsBlob(path), basename(path));
        const upload = await request('/upload', { method: 'POST', body: form });
        if (typeof upload?.id !== 'string' || typeof upload?.path !== 'string') {
          return { kind: 'rejected', problem: 'The provider did not return an uploaded media reference.' };
        }
        files.push({ id: upload.id, path: webUrl(upload.path) });
      }
      dispatchStarted = true;
      const value = await request('/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'now', date: new Date().toISOString(), shortLink: false, tags: [], posts: [{
          integration: { id: target.id }, value: [{ content: caption, image: files }], settings: providerSettings
        }] })
      });
      const record = Array.isArray(value) && value.find(row => row?.integration === target.id && typeof row.postId === 'string');
      return record ? { kind: 'accepted', providerId: record.postId } : { kind: 'unknown' };
    } catch (error) {
      if (!dispatchStarted || (error instanceof ProviderError && [400, 401, 403, 404, 413, 422, 429].includes(error.status))) {
        return { kind: 'rejected', problem: error instanceof Error ? error.message : 'The provider rejected the request.' };
      }
      return { kind: 'unknown', problem: 'The publishing response was lost. Verify a live post before attempting another send.' };
    }
  }

  async function verify(job) {
    if (!job.providerId || !job.attemptedAt) return { kind: 'unknown' };
    const started = Date.parse(job.attemptedAt);
    const parameters = new URLSearchParams({
      startDate: new Date(started - 86400000).toISOString(),
      endDate: new Date(Math.max(Date.now(), started) + 86400000).toISOString(),
    });
    const value = await request('/posts?' + parameters);
    const post = Array.isArray(value?.posts) && value.posts.find(row => row?.id === job.providerId && row.integration?.id === job.integrationId);
    if (post && post.state === 'PUBLISHED' && typeof post.releaseURL === 'string' && Number.isFinite(Date.parse(post.publishDate))) {
      return { kind: 'published', url: webUrl(post.releaseURL), publishedAt: post.publishDate };
    }
    return { kind: 'unknown' };
  }

  async function analytics(integration, days) {
    const rows = await request('/analytics/' + encodeURIComponent(integration.id) + '?date=' + days);
    if (!Array.isArray(rows)) return [];
    return rows.flatMap(row => {
      if (!row || typeof row.label !== 'string' || !Array.isArray(row.data)) return [];
      const label = row.label.trim().slice(0, 80);
      if (!label) return [];
      const point = row.data.filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
        && (typeof item.total === 'number' || typeof item.total === 'string' && item.total.trim() !== '')
        && Number.isFinite(Number(item.total)) && Number(item.total) >= 0)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!point) return [];
      return [{ key: 'postiz.' + integration.id + '.' + label.toLowerCase(),
        label: label + ' · ' + integration.label, platform: integration.platform,
        value: Number(point.total), checkedAt: point.date + 'T00:00:00+07:00',
        coverage: 'Postiz channel · ' + integration.label }];
    });
  }

  return { connections, submit, verify, analytics };
}

module.exports = { apiBase, createPublisher };
