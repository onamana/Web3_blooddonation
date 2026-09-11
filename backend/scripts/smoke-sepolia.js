// Explicit live test: mints one disposable certificate, transfers it, then marks
// it used. Sends Sepolia transactions and records public evidence only.
import "dotenv/config";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const root = fileURLToPath(new URL("../../", import.meta.url));
const requireFrontend = createRequire(path.join(root, "frontend/package.json"));
const { build } = requireFrontend("esbuild");
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, 11155111, { batchMaxCount: 1, cacheTimeout: -1 });
let server;
const report = { chainId: 11155111, startedAt: new Date().toISOString(), checks: [], transactions: {} };
const reportDir = path.join(root, "contract/deployments");
mkdirSync(reportDir, { recursive: true });
const reportFile = path.join(reportDir, `sepolia-smoke-${Date.now()}.json`);
const checkpoint = () => writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
function check(name) { report.checks.push(name); checkpoint(); console.log(`PASS: ${name}`); }

try {
  assert.equal((await provider.getNetwork()).chainId, 11155111n);
  const wallet = new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY, provider);
  const recipient = ethers.Wallet.createRandom().address;
  const address = process.env.CERTIFICATE_CONTRACT_ADDRESS;
  const abi = JSON.parse(readFileSync(path.join(root, "backend/contracts/BloodCertificate.sample.abi.json"), "utf8"));
  const certificate = new ethers.Contract(address, abi, wallet);
  assert.equal(await certificate.hasRole(await certificate.ISSUER_ROLE(), wallet.address), true);
  report.certificateAddress = address;
  report.donor = wallet.address;
  report.recipient = recipient;
  checkpoint();
  const { createApp } = await import("../src/app.js");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const apiUrl = `http://127.0.0.1:${server.address().port}`;
  const bundled = await build({ entryPoints: [path.join(root, "frontend/src/api/certificate.ts")], bundle: true,
    write: false, format: "esm", platform: "browser", define: { "import.meta.env": JSON.stringify({
      VITE_API_BASE_URL: apiUrl, VITE_DEMO_MODE: "false", VITE_CERTIFICATE_CONTRACT_ADDRESS: address, VITE_CHAIN_ID: "0xaa36a7",
    }) } });
  const frontend = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
  globalThis.window = { ethereum: { async request({ method, params }) {
    if (method === "eth_sendTransaction") {
      const { from, ...tx } = params[0];
      assert.equal(from.toLowerCase(), wallet.address.toLowerCase());
      return (await wallet.sendTransaction(tx)).hash;
    }
    if (method === "eth_signTypedData_v4") {
      const [signer, serialized] = params;
      assert.equal(signer.toLowerCase(), wallet.address.toLowerCase());
      const typedData = JSON.parse(serialized);
      const { EIP712Domain: _domainType, ...types } = typedData.types;
      return wallet.signTypedData(typedData.domain, types, typedData.message);
    }
    return provider.send(method, params || []);
  } } };
  const input = { to: wallet.address, donationType: "WHOLE_BLOOD", volumeMl: 400, requestId: `sepolia-smoke-${Date.now()}` };
  report.requestId = input.requestId;
  checkpoint();
  const issued = await frontend.issueCertificate(input);
  const tokenId = issued.certificate.tokenId;
  report.tokenId = tokenId;
  report.transactions.issue = issued.txHash;
  assert.equal(issued.certificate.volumeMl, 400);
  assert.equal(issued.certificate.donationType, "WHOLE_BLOOD");
  check("issue with off-chain donation metadata");
  const retried = await frontend.issueCertificate(input);
  assert.equal(retried.txHash, issued.txHash);
  check("same request does not mint twice");
  assert.ok((await frontend.listCertificates(wallet.address)).some((item) => item.tokenId === tokenId));
  assert.equal((await frontend.verifyCertificate(tokenId)).status, "valid");
  const raw = await (await fetch(`${apiUrl}/certificate/${tokenId}`)).json();
  assert.equal("bloodType" in raw, false);
  check("list/detail/verify contain no blood type");
  const transferred = await frontend.transferCertificate({ tokenId, from: wallet.address, to: recipient });
  report.transactions.transfer = transferred.txHash;
  assert.equal(transferred.certificate.owner.toLowerCase(), recipient.toLowerCase());
  assert.equal(transferred.certificate.volumeMl, 400);
  check("owner-signed relayed transfer updates ownership");
  assert.equal((await frontend.listCertificates(wallet.address)).some((item) => item.tokenId === tokenId), false);
  assert.ok((await frontend.listCertificates(recipient)).some((item) => item.tokenId === tokenId));
  check("owner lists reflect transfer");
  const used = await frontend.markCertificateUsed(tokenId, "Sepolia Smoke Hospital");
  report.transactions.use = used.txHash;
  assert.equal(used.certificate.status, "used");
  check("markUsed on Sepolia");
  await assert.rejects(frontend.markCertificateUsed(tokenId, "Sepolia Smoke Hospital"), (error) => error.status === 409);
  const usedTransfer = certificate.connect(new ethers.VoidSigner(recipient, provider));
  await assert.rejects(usedTransfer["safeTransferFrom(address,address,uint256)"].staticCall(recipient, wallet.address, tokenId),
    (error) => error.revert?.name === "UsedCertificateCannotBeTransferred");
  check("duplicate use and used-certificate transfer are blocked");
  const tx = await provider.getTransaction(issued.txHash);
  assert.equal(certificate.interface.parseTransaction(tx).args.length, 2);
  check("issue calldata contains only recipient and issuer");
  report.completedAt = new Date().toISOString();
  checkpoint();
  console.log("Evidence:", reportFile);
} catch (error) {
  report.failure = error.code || error.name;
  checkpoint();
  console.error("Sepolia smoke failed:", report.failure, "(RPC credentials hidden). Evidence:", reportFile);
  process.exitCode = 1;
} finally {
  if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  provider.destroy();
  delete globalThis.window;
}
