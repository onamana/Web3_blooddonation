import test from 'node:test';
import assert from 'node:assert/strict';
import { accessConfig } from '../src/config/access.js';

test('login is the default and missing/weak secrets fail closed', () => {
  assert.throws(() => accessConfig({}));
  assert.throws(() => accessConfig({ DEMO_ACCESS_PASSWORD: 'short', DEMO_SESSION_SECRET: 'x'.repeat(32) }));
  assert.equal(accessConfig({ DEMO_ACCESS_PASSWORD: 'x'.repeat(16), DEMO_SESSION_SECRET: 'y'.repeat(32) }).host, '127.0.0.1');
});
test('explicit bypass only accepts a literal loopback address without proxy or production', () => {
  const local = { DEMO_ALLOW_UNAUTHENTICATED: 'true' };
  assert.equal(accessConfig(local).password, '');
  for (const change of [{ HOST: '0.0.0.0' }, { HOST: 'localhost' }, { NODE_ENV: 'production' }, { TRUST_PROXY: '1' }, { DEMO_ACCESS_PASSWORD: 'x'.repeat(16) }]) {
    assert.throws(() => accessConfig({ ...local, ...change }));
  }
});
