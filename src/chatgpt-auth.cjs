'use strict';

const { createHash, createPublicKey, randomBytes, timingSafeEqual, verify } = require('node:crypto');
const { createServer } = require('node:http');

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const callbackPath = '/auth/callback';
const scopes = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';

async function tokenRequest(fetcher, form) {
  const response = await fetcher(issuer + '/api/accounts/oauth/token', {
    method: 'POST', body: new URLSearchParams({ ...form, resource }),
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error('ChatGPT did not authorize this connection. Sign in again or select OpenAI API key.');
  return response.json();
}

async function verifyIdentity(token, clientId, nonce, fetcher) {
  if (typeof token !== 'string') throw new Error('ChatGPT did not return a verified identity.');
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra !== undefined) throw new Error('ChatGPT returned an invalid identity token.');
  const { alg, kid } = JSON.parse(Buffer.from(header, 'base64url').toString());
  if (alg !== 'RS256' || typeof kid !== 'string') throw new Error('ChatGPT returned an unsupported identity signature.');
  const response = await fetcher(issuer + '/.well-known/jwks.json', {
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error('Orbit could not verify the ChatGPT signing key.');
  const { keys } = await response.json();
  const jwk = keys?.find(key => key.kid === kid && key.kty === 'RSA' && (!key.use || key.use === 'sig'));
  if (!jwk || !verify('RSA-SHA256', Buffer.from(header + '.' + payload),
    createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(signature, 'base64url'))) {
    throw new Error('Orbit could not verify the identity signature.');
  }
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== issuer || !audience.includes(clientId)
      || (audience.length > 1 || claims.azp !== undefined) && claims.azp !== clientId
      || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()
      || claims.nonce !== nonce || typeof claims.sub !== 'string' || !claims.sub) {
    throw new Error('The ChatGPT identity did not match this sign-in attempt.');
  }
  return claims.sub;
}

function renewableToken(result) {
  if (typeof result.scope !== 'string' || !result.scope.split(/\s+/).includes('chatgpt.tokens.use.direct')) {
    throw new Error('This ChatGPT account did not grant plan usage for Orbit. Use an eligible account or select OpenAI API key.');
  }
  if (typeof result.access_token !== 'string' || typeof result.refresh_token !== 'string'
      || !Number.isFinite(result.expires_in) || result.expires_in <= 0) {
    throw new Error('ChatGPT did not return a renewable connection.');
  }
  return { scope: result.scope, access: result.access_token, refresh: result.refresh_token,
    expiresAt: Date.now() + result.expires_in * 1000 };
}

function createChatGPTConnection({ load, save, openBrowser, onUpdate, fetcher = fetch }) {
  let attempt;
  let refreshing;

  function finish(current, message) {
    if (attempt !== current) return;
    attempt = undefined;
    clearTimeout(current.timer);
    current.server.close();
    onUpdate(message);
  }

  async function connect(hostId) {
    if (attempt) throw new Error('A ChatGPT sign-in is already open.');
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const previous = load();
    const current = { server: createServer(handle) };
    attempt = current;
    let redirectUri;

    async function handle(request, reply) {
      let target;
      try { target = new URL(request.url, redirectUri); }
      catch { reply.writeHead(400).end(); return; }
      const received = Buffer.from(target.searchParams.get('state') || '');
      const expected = Buffer.from(state);
      if (request.method !== 'GET' || target.pathname !== callbackPath || target.origin !== new URL(redirectUri).origin
          || received.length !== expected.length || !timingSafeEqual(received, expected)
          || attempt !== current || current.processing) {
        reply.writeHead(400, { 'Cache-Control': 'no-store' }).end('This sign-in request is unavailable.');
        return;
      }
      current.processing = true;
      let message;
      try {
        const clientId = target.searchParams.get('client_id') || previous?.clientId;
        const code = target.searchParams.get('code');
        if (!/^oaiapp_[A-Za-z0-9_-]+$/.test(clientId || '') || !code
            || previous && clientId !== previous.clientId || target.searchParams.has('error')) {
          throw new Error('ChatGPT sign-in was declined or the Orbit registration was unavailable.');
        }
        const result = await tokenRequest(fetcher, { grant_type: 'authorization_code', client_id: clientId,
          code, code_verifier: verifier, redirect_uri: redirectUri });
        const subject = await verifyIdentity(result.id_token, clientId, nonce, fetcher);
        if (previous && previous.subject !== subject) throw new Error('Choose the same ChatGPT account to renew this connection.');
        const credentials = { ...renewableToken(result), clientId, subject };
        if (attempt !== current) throw new Error('The sign-in request expired.');
        save(credentials, true);
        message = 'ChatGPT connected. Return to Orbit.';
        reply.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end(message);
      } catch (error) {
        message = error instanceof Error && error.message.startsWith('ChatGPT')
          ? error.message : 'ChatGPT sign-in could not be verified. Check Orbit to try again.';
        reply.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end(message);
      } finally { finish(current, message); }
    }
    try {
      await new Promise((resolve, reject) => {
        current.server.once('error', reject);
        current.server.listen(0, '127.0.0.1', resolve);
      });
      redirectUri = 'http://127.0.0.1:' + current.server.address().port + callbackPath;
      current.timer = setTimeout(() => finish(current, 'ChatGPT sign-in expired. Try again in Settings.'), 300000);
      const url = new URL('/api/accounts/authorize', issuer);
      url.search = new URLSearchParams({ response_type: 'code', client_id: previous?.clientId || 'dynamic_agent_client',
        ...(!previous && { agent_name_hint: 'Orbit' }), ext_agent_host_id: hostId,
        redirect_uri: redirectUri, scope: scopes, resource, state, nonce, code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      }).toString();
      await openBrowser(url.href);
      onUpdate();
    } catch {
      finish(current);
      throw new Error('Orbit could not open ChatGPT sign-in.');
    }
  }

  async function credentials() {
    const saved = load();
    if (!saved) throw new Error('Sign in with ChatGPT in Orbit Settings first.');
    if (saved.expiresAt > Date.now() + 60000) return saved.access;
    if (!refreshing) {
      refreshing = tokenRequest(fetcher, {
        grant_type: 'refresh_token', client_id: saved.clientId, refresh_token: saved.refresh,
      }).then(result => {
        if (load()?.refresh !== saved.refresh) throw new Error('The Orbit Agent connection changed.');
        const updated = { ...saved, ...renewableToken({ ...result, scope: result.scope ?? saved.scope }) };
        save(updated, false);
        return updated.access;
      }).finally(() => { refreshing = undefined; });
    }
    return refreshing;
  }

  return { connect, credentials, pending: () => Boolean(attempt), cancel: () => { if (attempt) finish(attempt); } };
}

module.exports = { createChatGPTConnection };
