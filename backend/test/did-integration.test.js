import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { ethers } from 'ethers';

const root = fileURLToPath(new URL('../../', import.meta.url));
async function port() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
async function stop(child) {
  if (child && child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
}
async function ready(url, child) {
  let lastStatus = 'unreachable';
  for (let i = 0; i < 300; i++) {
    if (child.exitCode !== null) throw new Error(`Server exited with ${child.exitCode}`);
    try { const response = await fetch(`${url}/health`); lastStatus = response.status; if (response.ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server readiness timeout at ${url}: ${lastStatus}`);
}

test('authenticated demo -> backend -> persistent DID service', { timeout: 60000 }, async t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'bloodpass-did-'));
  const didPort = await port(), apiPort = await port();
  const didUrl = `http://127.0.0.1:${didPort}`, apiUrl = `http://127.0.0.1:${apiPort}`;
  const internalKey = randomBytes(32).toString('hex'), password = randomBytes(24).toString('hex');
  const didEnv = { ...process.env, NODE_ENV: 'production', PORT: String(didPort), DID_DB_PATH: path.join(dir, 'vc.sqlite'),
    DID_ISSUER_PRIVATE_KEY: ethers.Wallet.createRandom().privateKey, DID_ISSUE_API_KEY: internalKey, DID_SEED_DEMO: 'false' };
  const apiEnv = { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', DEMO_ALLOW_UNAUTHENTICATED: 'false', PORT: String(apiPort), DID_MODULE_BASE_URL: didUrl,
    DEMO_ACCESS_PASSWORD: password, DEMO_SESSION_SECRET: randomBytes(32).toString('hex'), DID_ISSUE_API_KEY: internalKey,
    CERTIFICATE_DB_PATH: path.join(dir, 'certificates.sqlite') };
  const start = (folder, env) => spawn(process.execPath, ['src/server.js'], { cwd: path.join(root, folder), env, windowsHide: true, stdio: 'ignore' });
  let did = start('did', didEnv), api = start('backend', apiEnv);
  t.after(async () => { await stop(api); await stop(did); });
  await Promise.all([ready(didUrl, did), ready(apiUrl, api)]);
  const post = (base, route, body, headers = {}) => fetch(`${base}${route}`, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Demo-Request': '1', ...headers,
  }, body: JSON.stringify(body) });
  let cookie;
  const call = (route, body) => post(apiUrl, route, body, { cookie });
  await t.test('private endpoints require login, internal key and CSRF header', async () => {
    assert.equal((await post(apiUrl, '/match', {})).status, 401);
    assert.equal((await post(apiUrl, '/certificate/issue', {})).status, 401);
    assert.equal((await post(apiUrl, '/certificate/0/use', {})).status, 401);
    assert.equal((await post(didUrl, '/match', {})).status, 401);
    assert.equal((await post(didUrl, '/vc/verify', {})).status, 401);
    assert.equal((await fetch(`${didUrl}/vc`)).status, 404);
    assert.equal((await post(apiUrl, '/session/login', { password: 'wrong' })).status, 401);
    const login = await post(apiUrl, '/session/login', { password });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    assert.match(login.headers.get('set-cookie'), /Secure/);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(`${apiUrl}/match`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await post(apiUrl, '/match', {}, { cookie: `${cookie}tampered` })).status, 401);
  });
  const holder = ethers.Wallet.createRandom().address;
  const input = { holderAddress: holder, bloodType: 'O', isEligible: true,
    lastDonationDate: new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10), daysValid: 90 };
  let vc;
  await t.test('direct DID and backend reject the same invalid issue and match inputs', async () => {
    const invalidIssues = [
      { ...input, holderAddress: 'not-an-address' }, { ...input, bloodType: 'o' },
      { ...input, isEligible: 'true' }, { ...input, extra: true },
      { ...input, lastDonationDate: '2026-02-30' }, { ...input, lastDonationDate: '2999-01-01' },
      ...[-1, 0, 1.5, '90', 366].map(daysValid => ({ ...input, daysValid })),
    ];
    const invalidMatches = [
      { bloodType: 'o' }, { bloodType: 'INVALID' }, { onlyEligible: 'false' }, { extra: true },
      ...[-1, 1.5, '60', 36501].map(minDaysSinceLastDonation => ({ minDaysSinceLastDonation })),
    ];
    for (const [route, internal, cases] of [['/credentials/issue', '/vc/issue', invalidIssues], ['/match', '/match', invalidMatches]]) {
      for (const body of cases) {
        assert.equal((await call(route, body)).status, 400);
        assert.equal((await post(didUrl, internal, body, { 'x-api-key': internalKey })).status, 400);
      }
      for (const body of [undefined, null, []]) {
        assert.equal((await call(route, body)).status, 400);
        assert.equal((await post(didUrl, internal, body, { 'x-api-key': internalKey })).status, 400);
      }
    }
    for (const body of [{}, { minDaysSinceLastDonation: 0, onlyEligible: false }, { minDaysSinceLastDonation: 36500 }]) {
      const direct = await post(didUrl, '/match', body, { 'x-api-key': internalKey });
      const proxied = await call('/match', body);
      assert.equal(direct.status, 200); assert.equal(proxied.status, 200);
      assert.deepEqual((await direct.json()).query, (await proxied.json()).query);
    }
    assert.equal((await post(didUrl, '/vc/issue', input, { 'x-api-key': internalKey, Origin: 'https://untrusted.invalid' })).status, 400);
  });
  await t.test('issue, verify and match through the backend; reject old and malformed inputs', async () => {
    assert.equal((await call('/match', { recentDonationWithinDays: 60 })).status, 400);
    assert.equal((await call('/credentials/issue', { ...input, daysValid: -1 })).status, 400);
    assert.equal((await call('/credentials/issue', { ...input, lastDonationDate: '2026-02-30' })).status, 400);
    assert.equal((await call('/credentials/issue', { ...input, isEligible: undefined })).status, 400);
    const response = await call('/credentials/issue', input);
    assert.equal(response.status, 201); vc = (await response.json()).vc;
    assert.equal((await (await call('/credentials/verify', { vc })).json()).isValid, true);
    const matches = await (await call('/match', { bloodType: 'O', minDaysSinceLastDonation: 60 })).json();
    assert.equal(matches.matchedCount, 1); assert.equal(matches.matches[0].holderDid, `did:ethr:${holder}`);
    assert.equal((await (await call('/match', { bloodType: 'A' })).json()).matchedCount, 0);
    assert.equal((await (await call('/match', { minDaysSinceLastDonation: 121 })).json()).matchedCount, 0);
    const altered = structuredClone(vc); altered.credentialSubject.bloodType = 'A';
    assert.equal((await (await call('/credentials/verify', { vc: altered })).json()).isValid, false);
  });
  await t.test('restart preserves credentials; renewal invalidates old signed VC and deduplicates holder', async () => {
    await stop(did); did = start('did', didEnv); await ready(didUrl, did);
    assert.equal((await (await call('/match', {})).json()).matchedCount, 1);
    assert.equal((await (await call('/credentials/verify', { vc })).json()).isValid, true);
    const old = vc;
    vc = (await (await call('/credentials/issue', { ...input, isEligible: false })).json()).vc;
    assert.equal((await (await call('/credentials/verify', { vc: old })).json()).isValid, false);
    const forgedId = { ...old, id: 'urn:uuid:changed' };
    assert.equal((await (await call('/credentials/verify', { vc: forgedId })).json()).isValid, false);
    assert.equal((await (await call('/match', {})).json()).matchedCount, 0);
    assert.equal((await (await call('/match', { onlyEligible: false })).json()).matchedCount, 1);
  });
  await t.test('revocation survives restart and excludes candidate', async () => {
    assert.equal((await call('/credentials/revoke', { id: vc.id })).status, 200);
    await stop(did); did = start('did', didEnv); await ready(didUrl, did);
    assert.equal((await (await call('/credentials/verify', { vc })).json()).isValid, false);
    assert.equal((await (await call('/match', { onlyEligible: false })).json()).matchedCount, 0);
  });
  await t.test('OpenAPI, outage handling, logout and login throttling', async () => {
    const spec = await (await fetch(`${apiUrl}/openapi.json`, { headers: { cookie } })).json();
    assert.ok(spec.paths['/credentials/issue']);
    await stop(did);
    const failure = await call('/match', {});
    assert.equal(failure.status, 502);
    assert.doesNotMatch(await failure.text(), /127\.0\.0\.1|ECONNREFUSED/);
    const logout = await call('/session/logout', {});
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    for (let i = 0; i < 10; i++) await post(apiUrl, '/session/login', { password: 'wrong' });
    assert.equal((await post(apiUrl, '/session/login', { password })).status, 429);
  });
});
