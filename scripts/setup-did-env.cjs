// Local setup: never prints secrets; preserves populated values and refuses mismatched keys.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { Wallet } = createRequire(path.join(root, 'backend/package.json'))('ethers');
const read = (folder, root) => {
  const file = path.join(root, folder, '.env');
  return { file, exists: fs.existsSync(file), text: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fs.readFileSync(path.join(root, folder, '.env.example'), 'utf8') };
};
function fill(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  return re.test(text) ? text.replace(re, () => `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`;
}
function main(directory = root) {
  const backend = read('backend', directory), did = read('did', directory);
  const b = parseEnv(backend.text), d = parseEnv(did.text);
  if (b.DID_ISSUE_API_KEY && d.DID_ISSUE_API_KEY && b.DID_ISSUE_API_KEY !== d.DID_ISSUE_API_KEY) throw new Error('Existing internal keys differ; reconcile them manually');
  const key = b.DID_ISSUE_API_KEY || d.DID_ISSUE_API_KEY || randomBytes(32).toString('hex');
  if (key.length < 32) throw new Error('Existing internal key is too short; no files changed');
  const issuer = d.DID_ISSUER_PRIVATE_KEY || Wallet.createRandom().privateKey;
  let wallet;
  try { wallet = new Wallet(issuer); } catch { throw new Error('Existing issuer key is invalid; no files changed'); }
  if (wallet.address === '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266') throw new Error('Replace the known public test issuer before setup');
  const password = b.DEMO_ACCESS_PASSWORD || randomBytes(24).toString('base64url');
  const secret = b.DEMO_SESSION_SECRET || randomBytes(32).toString('hex');
  if (password.length < 16 || secret.length < 32) throw new Error('Existing login configuration is too short; no files changed');
  const updates = [[did, { DID_ISSUER_PRIVATE_KEY: issuer, DID_ISSUE_API_KEY: key }],
    [backend, { DID_ISSUE_API_KEY: key, DEMO_ACCESS_PASSWORD: password, DEMO_SESSION_SECRET: secret }]];
  if (b.DEMO_ALLOW_UNAUTHENTICATED === 'true') throw new Error('Disable local bypass before setting up login');
  for (const [entry, values] of updates) {
    let text = entry.text;
    const existing = parseEnv(entry.text);
    // Keep quoting, comments and formatting of already populated values intact.
    for (const [name, value] of Object.entries(values)) if (!existing[name]) text = fill(text, name, value);
    if (!entry.exists || text !== entry.text) fs.writeFileSync(entry.file, text, { mode: 0o600, flag: entry.exists ? 'w' : 'wx' });
  }
  console.log('DID and backend configuration ready. Existing keys preserved. Read DEMO_ACCESS_PASSWORD privately from backend/.env.');
}
module.exports = { setup: main };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.code ? `Setup failed (${error.code})` : error.message); process.exitCode = 1; }
}
