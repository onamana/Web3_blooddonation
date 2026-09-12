const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { setup } = require('./setup-did-env.cjs');
test('setup is repeatable, preserves keys and refuses conflicting/weak values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloodpass-setup-'));
  for (const folder of ['backend', 'did']) {
    fs.mkdirSync(path.join(dir, folder));
    fs.writeFileSync(path.join(dir, folder, '.env.example'), 'PORT=1234\n');
  }
  setup(dir);
  const bp = path.join(dir, 'backend/.env'), dp = path.join(dir, 'did/.env');
  const first = fs.readFileSync(dp, 'utf8'), original = fs.readFileSync(bp, 'utf8');
  const b = parseEnv(original), d = parseEnv(first);
  assert.equal(b.DID_ISSUE_API_KEY, d.DID_ISSUE_API_KEY);
  assert.equal(b.DID_ISSUE_API_KEY.length, 64);
  assert.equal(b.PORT, '1234');
  setup(dir);
  assert.equal(fs.readFileSync(dp, 'utf8'), first);
  assert.equal(fs.readFileSync(bp, 'utf8'), original);
  const quoted = original.replace(b.DEMO_ACCESS_PASSWORD, '"a-long-password#with-comment-char"');
  fs.writeFileSync(bp, quoted);
  setup(dir);
  assert.equal(fs.readFileSync(bp, 'utf8'), quoted);
  fs.writeFileSync(bp, original.replace(b.DID_ISSUE_API_KEY, 'z'.repeat(64)));
  assert.throws(() => setup(dir), /differ/);
  assert.equal(fs.readFileSync(dp, 'utf8'), first);
  fs.writeFileSync(bp, original.replace(b.DEMO_ACCESS_PASSWORD, 'short'));
  assert.throws(() => setup(dir), /too short/);
});
