import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { ethers } = require('ethers');
const env = parseEnv(readFileSync(new URL('../deploy/.env', import.meta.url), 'utf8'));
const check = (condition, message) => { if (!condition) throw new Error(message); };
let provider;
try {
  check(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(env.DEMO_DOMAIN || '') && !env.DEMO_DOMAIN.endsWith('example.com'), 'Set a real HTTPS domain');
  check((env.DEMO_ACCESS_PASSWORD || '').length >= 16, 'DEMO_ACCESS_PASSWORD must contain at least 16 characters');
  for (const key of ['DEMO_SESSION_SECRET', 'DID_ISSUE_API_KEY']) check((env[key] || '').length >= 32, `${key} must contain at least 32 characters`);
  new ethers.Wallet(env.DID_ISSUER_PRIVATE_KEY);
  check(ethers.isAddress(env.CERTIFICATE_CONTRACT_ADDRESS), 'Invalid certificate address');
  check(ethers.isAddress(env.DONATION_CONTRACT_ADDRESS), 'Invalid registry address');
  check(/^\d+$/.test(env.CERTIFICATE_DEPLOY_BLOCK || '') && Number(env.CERTIFICATE_DEPLOY_BLOCK) > 0, 'Set the certificate deployment block');
  provider = new ethers.JsonRpcProvider(env.SEPOLIA_RPC_URL, undefined, { batchMaxCount: 1 });
  check((await provider.getNetwork()).chainId === 11155111n, 'RPC must point to Sepolia');
  const signer = new ethers.Wallet(env.BACKEND_SIGNER_PRIVATE_KEY, provider);
  check(await provider.getBalance(signer.address) > ethers.parseEther('0.005'), 'Fund the demo relayer with Sepolia ETH');
  const abi = JSON.parse(readFileSync(new URL('../backend/contracts/BloodCertificate.sample.abi.json', import.meta.url), 'utf8'));
  const certificate = new ethers.Contract(env.CERTIFICATE_CONTRACT_ADDRESS, abi, provider);
  check(await certificate.hasRole(await certificate.ISSUER_ROLE(), signer.address), 'Backend signer requires ISSUER_ROLE');
  const registry = new ethers.Contract(env.DONATION_CONTRACT_ADDRESS, ['function RECORDER_ROLE() view returns(bytes32)', 'function hasRole(bytes32,address) view returns(bool)'], provider);
  check(await registry.hasRole(await registry.RECORDER_ROLE(), signer.address), 'Backend signer requires RECORDER_ROLE');
  check(await provider.getCode(env.CERTIFICATE_CONTRACT_ADDRESS, Number(env.CERTIFICATE_DEPLOY_BLOCK)) !== '0x', 'Deployment block does not contain the certificate contract');
  check(await certificate.supportsInterface('0x80ac58cd'), 'Certificate must support ERC-721');
  const digest = await certificate.transferAuthorizationDigest(signer.address, ethers.ZeroAddress, 0, ethers.ZeroHash, 0);
  check(/^0x[0-9a-f]{64}$/i.test(digest), 'Expected relayed-transfer contract interface is missing');
  console.log('Demo preflight passed: Sepolia, contract interface, roles, balance and configuration verified. No transactions sent.');
} catch (error) {
  // Provider errors may contain RPC credentials or private request payloads.
  console.error(error.code ? `Preflight failed (${error.code}); check RPC/configuration privately.` : error.message);
  process.exitCode = 1;
} finally { provider?.destroy(); }
