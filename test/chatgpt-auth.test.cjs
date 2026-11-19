'use strict';

const { createHash, generateKeyPairSync, sign } = require('node:crypto');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createChatGPTConnection } = require('../src/chatgpt-auth.cjs');
const { answer, listAgentModels } = require('../src/agent.cjs');

test('the model picker reads each connection’s catalog and excludes unavailable options', async () => {
  const chatGPTCatalog = { models: [
    { slug: 'gpt-6.2-sol', visibility: 'list' }, { slug: 'gpt-6-luna', visibility: 'hidden' },
    { slug: 'invalid model', visibility: 'list' }, { slug: 'gpt-6.2-sol', visibility: 'list' }
  ] };
  const apiCatalog = { data: [
    { id: 'gpt-6.2-astra' }, { id: 'gpt-4o-audio-preview' }, { id: 'text-embedding-3-large' },
    { id: 'gpt-5.4-mini' }, { id: 'gpt-6-cyber' }, { id: 'ft:gpt-4.1:fixture:default' }
  ] };
  async function fetcher(url, options) {
    assert.equal(url, 'https://api.openai.com/v1/models');
    if (options.headers.Authorization === 'Bearer oauth-test') return Response.json(chatGPTCatalog);
    assert.equal(options.headers.Authorization, 'Bearer key-test');
    return Response.json(apiCatalog);
  }
  assert.deepEqual(await listAgentModels({ key: 'oauth-test', mode: 'chatgpt', fetcher }), ['gpt-6.2-sol']);
  assert.deepEqual(await listAgentModels({ key: 'key-test', mode: 'api-key', defaultModel: 'ft:gpt-4.1:fixture:default', fetcher }),
    ['ft:gpt-4.1:fixture:default', 'gpt-5.4-mini', 'gpt-6.2-astra']);
});

test('ChatGPT sign-in binds the local callback to PKCE and verifies the identity before saving', async t => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const clientId = 'oaiapp_fixture';
  const scope = 'openid resource.invoke chatgpt.tokens.use.direct';
  let page;
  let stored;
  let refreshes = 0;
  const connection = createChatGPTConnection({
    load: () => stored,
    save: value => { stored = value; },
    openBrowser: value => { page = new URL(value); },
    onUpdate: () => {},
    async fetcher(url, request) {
      if (url.endsWith('/jwks.json')) return Response.json({
        keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'fixture' }],
      });
      const grant = request.body.get('grant_type');
      assert.equal(request.body.get('client_id'), clientId);
      assert.equal(request.body.get('resource'), 'https://api.openai.com/v1');
      if (grant === 'refresh_token') {
        refreshes++;
        return Response.json({ access_token: 'replacement', refresh_token: 'rotated', expires_in: 3600 });
      }
      assert.equal(grant, 'authorization_code');
      assert.equal(request.body.get('redirect_uri'), page.searchParams.get('redirect_uri'));
      const proof = createHash('sha256').update(request.body.get('code_verifier')).digest('base64url');
      assert.equal(proof, page.searchParams.get('code_challenge'));
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const header = encode({ alg: 'RS256', kid: 'fixture' });
      const payload = encode({ iss: 'https://auth.openai.com', aud: clientId, exp: Date.now() / 1000 + 100,
        sub: 'verified-fixture', nonce: page.searchParams.get('nonce') });
      const signature = sign('RSA-SHA256', Buffer.from(header + '.' + payload), privateKey).toString('base64url');
      return Response.json({ id_token: [header, payload, signature].join('.'), scope,
        access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600 });
    },
  });
  t.after(() => connection.cancel());
  await connection.connect('urn:uuid:fixture');
  assert.equal(page.searchParams.get('code_challenge_method'), 'S256');
  const callback = new URL(page.searchParams.get('redirect_uri'));
  callback.search = new URLSearchParams({ client_id: clientId, code: 'fixture-code', state: 'incorrect' });
  assert.equal((await fetch(callback)).status, 400);
  assert.equal(stored, undefined);
  callback.searchParams.set('state', page.searchParams.get('state'));
  assert.equal((await fetch(callback)).status, 200);
  assert.equal(stored.subject, 'verified-fixture');
  assert.equal(await connection.credentials(), 'fixture-access');
  stored.expiresAt = 0;
  assert.deepEqual(await Promise.all([connection.credentials(), connection.credentials()]), ['replacement', 'replacement']);
  assert.equal(refreshes, 1);
  assert.equal(stored.refresh, 'rotated');
});

test('ChatGPT Agent uses streamed Responses and only the Orbit tool namespace', async () => {
  const result = await answer({
    key: 'fixture-oauth', chatGPT: true, model: 'fixture', prompt: 'How many saved accounts?', history: [],
    snapshot: () => ({ accounts: [] }),
    async fetcher(_, request) {
      const body = JSON.parse(request.body);
      assert.equal(body.stream, true);
      assert.equal(body.max_output_tokens, undefined);
      assert.equal(body.tools[0].type, 'namespace');
      assert.equal(body.tools[0].name, 'orbit');
      return new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { output: [
        { type: 'message', content: [{ type: 'output_text', text: 'There are no saved accounts.' }] }
      ] } }) + '\n\n');
    },
  });
  assert.equal(result, 'There are no saved accounts.');
});
