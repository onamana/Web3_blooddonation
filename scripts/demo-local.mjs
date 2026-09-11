// Isolated local demo: overrides chain/key settings and never sends Sepolia transactions.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../contract/package.json', import.meta.url));
const { ethers } = require('ethers');
const ports = { rpc: 18545, api: 4100, did: 5101, web: 5175 };
const children = [];
let provider;
let exiting = false;
async function shutdown(code = 0) {
  if (exiting) return; exiting = true;
  provider?.destroy();
  for (const child of children.reverse()) {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
  }
  process.exit(code);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
function start(folder, args, env = {}, quiet = false) {
  const child = spawn(process.execPath, args, { cwd: path.join(root, folder), windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', ...env }, stdio: quiet ? 'ignore' : ['ignore', 'inherit', 'inherit'] });
  children.push(child);
  child.on('error', () => { console.error(`Could not start ${folder}`); void shutdown(1); });
  return child;
}
async function ready(url, child) {
  for (let i = 0; i < 300; i++) {
    if (child.exitCode !== null) throw new Error('Demo subprocess exited before becoming ready');
    try { if ((await fetch(url)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Demo readiness timed out: ${url}`);
}
try {
  for (const port of Object.values(ports)) {
    const server = createServer(); server.listen(port, '127.0.0.1'); await once(server, 'listening');
    await new Promise(resolve => server.close(resolve));
  }
  const dir = path.join(root, '.demo'); mkdirSync(dir, { recursive: true });
  const secretsFile = path.join(dir, 'secrets.json');
  let secrets;
  if (existsSync(secretsFile)) secrets = JSON.parse(readFileSync(secretsFile, 'utf8'));
  else {
    secrets = { accessPassword: randomBytes(18).toString('base64url'), sessionSecret: randomBytes(32).toString('hex'),
      internalKey: randomBytes(32).toString('hex'), issuerKey: ethers.Wallet.createRandom().privateKey,
      donorPrivateKey: ethers.Wallet.createRandom().privateKey };
    writeFileSync(secretsFile, JSON.stringify(secrets, null, 2), { mode: 0o600, flag: 'wx' });
  }
  const chain = start('contract', ['node_modules/hardhat/internal/cli/cli.js', 'node', '--hostname', '127.0.0.1', '--port', String(ports.rpc)], {}, true);
  const rpc = `http://127.0.0.1:${ports.rpc}`;
  provider = new ethers.JsonRpcProvider(rpc, 31337, { batchMaxCount: 1, pollingInterval: 100 });
  for (let i = 0; i < 300; i++) {
    if (chain.exitCode !== null) throw new Error('Local chain failed to start');
    try { if (await provider.send('eth_chainId', []) === '0x7a69') break; } catch { /* starting */ }
    if (i === 299) throw new Error('Local chain readiness timeout');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const admin = ethers.Wallet.createRandom().connect(provider);
  const donor = new ethers.Wallet(secrets.donorPrivateKey);
  for (const address of [admin.address, donor.address]) await provider.send('hardhat_setBalance', [address, ethers.toQuantity(ethers.parseEther('100'))]);
  async function deploy(name) {
    const artifact = JSON.parse(readFileSync(path.join(root, `contract/artifacts/contracts/${name}.sol/${name}.json`), 'utf8'));
    const contract = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, admin).deploy(admin.address);
    await contract.waitForDeployment(); return contract;
  }
  const certificate = await deploy('BloodCertificate');
  const registry = await deploy('DonationRegistry');
  const receipt = await certificate.deploymentTransaction().wait();
  const did = start('did', ['src/server.js'], { PORT: String(ports.did), DID_DB_PATH: path.join(dir, 'credentials.sqlite'),
    DID_ISSUE_API_KEY: secrets.internalKey, DID_ISSUER_PRIVATE_KEY: secrets.issuerKey, DID_SEED_DEMO: 'false' });
  const didUrl = `http://127.0.0.1:${ports.did}`;
  await ready(`${didUrl}/health`, did);
  const headers = { 'Content-Type': 'application/json', 'x-api-key': secrets.internalKey };
  const saved = await (await fetch(`${didUrl}/vc`, { headers })).json();
  if (!saved.length && !existsSync(path.join(dir, 'seeded'))) {
    const response = await fetch(`${didUrl}/vc/issue`, { method: 'POST', headers, body: JSON.stringify({ holderAddress: donor.address,
      bloodType: 'O', isEligible: true, lastDonationDate: new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10), daysValid: 90 }) });
    if (!response.ok) throw new Error('Local sample credential could not be created');
    writeFileSync(path.join(dir, 'seeded'), 'Demo seed created once.');
  }
  const api = start('backend', ['src/server.js'], { PORT: String(ports.api), SEPOLIA_RPC_URL: rpc, CHAIN_ID: '31337',
    BACKEND_SIGNER_PRIVATE_KEY: admin.privateKey, CERTIFICATE_CONTRACT_ADDRESS: await certificate.getAddress(),
    CERTIFICATE_DEPLOY_BLOCK: String(receipt.blockNumber), DONATION_CONTRACT_ADDRESS: await registry.getAddress(),
    CERTIFICATE_DB_PATH: path.join(dir, 'certificates.sqlite'), DID_MODULE_BASE_URL: didUrl, DID_ISSUE_API_KEY: secrets.internalKey,
    DEMO_ACCESS_PASSWORD: process.env.DEMO_LOCAL_ACCESS_PASSWORD || secrets.accessPassword, DEMO_SESSION_SECRET: secrets.sessionSecret,
    ALLOWED_ORIGINS: `http://localhost:${ports.web}`, TRUST_PROXY: '', PUBLIC_API_PREFIX: '/', BLOOD_CENTER_NAME: 'Demo Blood Center' });
  await ready(`http://127.0.0.1:${ports.api}/health`, api);
  const web = start('frontend', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(ports.web), '--strictPort'], {
    VITE_API_BASE_URL: `http://localhost:${ports.api}`, VITE_DEMO_MODE: 'false', VITE_CHAIN_ID: '0x7a69',
    VITE_CERTIFICATE_CONTRACT_ADDRESS: await certificate.getAddress(), VITE_EXPLORER_BASE_URL: '' });
  await ready(`http://127.0.0.1:${ports.web}`, web);
  writeFileSync(path.join(dir, 'connection.json'), JSON.stringify({ url: `http://localhost:${ports.web}`, rpc, chainId: 31337,
    donorAddress: donor.address, certificateAddress: await certificate.getAddress(), note: 'Local chain resets on restart. VC database persists.' }, null, 2));
  console.log(`Local demo ready: http://localhost:${ports.web}/credentials`);
  console.log('Access password and local demo wallet key: .demo/secrets.json (not printed). Connection details: .demo/connection.json');
  for (const child of children) child.once('exit', () => { if (!exiting) { console.error('A demo service stopped; shutting down.'); void shutdown(1); } });
} catch (error) {
  console.error(error.code ? `Local demo failed (${error.code}). Check dependencies, ports and compiled contracts.` : error.message);
  await shutdown(1);
}
