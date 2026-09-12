const { spawnSync } = require('node:child_process');
const { Wallet } = require('ethers');
const path = require('node:path');
const cwd = path.join(__dirname, '..');
function start(key, mode = 'test') {
  return spawnSync(process.execPath, ['-e', "require('./src/services/vcService')"], {
    cwd, windowsHide: true, encoding: 'utf8', timeout: 10000,
    env: { ...process.env, NODE_ENV: mode, DID_DB_PATH: ':memory:', DID_ISSUER_PRIVATE_KEY: key },
  });
}
test('missing or malformed issuer fails with a safe message', () => {
  for (const key of ['', 'secret-that-must-not-be-echoed']) {
    const result = start(key);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('DID_ISSUER_PRIVATE_KEY');
    if (key) expect(result.stderr).not.toContain(key);
  }
});
test('fresh issuer starts but known public test issuer is rejected outside tests', () => {
  expect(start(Wallet.createRandom().privateKey).status).toBe(0);
  const publicTestKey = Wallet.fromPhrase('test test test test test test test test test test test junk').privateKey;
  expect(start(publicTestKey, 'development').status).not.toBe(0);
});
