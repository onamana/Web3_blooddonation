import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const root = fileURLToPath(new URL("../../", import.meta.url));
const frontendRequire = createRequire(path.join(root, "frontend/package.json"));
const { build } = frontendRequire("esbuild");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
function startNode(args, cwd, env) {
  // Hardhat prints local account keys at startup. Keep subprocess output private.
  return spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: "ignore" });
}
async function stop(child) {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
}
async function waitReady(probe, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Test subprocess exited: ${child.exitCode}`);
    try { if (await probe()) return; } catch { /* starting */ }
    await delay(100);
  }
  throw new Error("Test subprocess did not become ready");
}

test("browserless frontend -> HTTP API -> local contracts", { timeout: 180000 }, async (t) => {
  const rpcPort = await freePort();
  const apiPort = await freePort();
  const rpcUrl = `http://127.0.0.1:${rpcPort}`;
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const temp = mkdtempSync(path.join(tmpdir(), "bloodpass-integration-"));
  const chain = startNode(["node_modules/hardhat/internal/cli/cli.js", "node", "--hostname", "127.0.0.1", "--port", String(rpcPort)], path.join(root, "contract"), process.env);
  let api;
  const provider = new ethers.JsonRpcProvider(rpcUrl, 31337, { batchMaxCount: 1, cacheTimeout: -1, pollingInterval: 50 });
  t.after(async () => { await stop(api); provider.destroy(); await stop(chain); delete globalThis.window; });
  await waitReady(async () => {
    const response = await fetch(rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
    return (await response.json()).result === "0x7a69";
  }, chain);
  const admin = ethers.Wallet.createRandom().connect(provider);
  const donor = ethers.Wallet.createRandom().connect(provider);
  const recipient = ethers.Wallet.createRandom().connect(provider);
  for (const wallet of [admin, donor, recipient]) await provider.send("hardhat_setBalance", [wallet.address, ethers.toQuantity(ethers.parseEther("100"))]);
  async function deploy(name) {
    const artifact = JSON.parse(readFileSync(path.join(root, `contract/artifacts/contracts/${name}.sol/${name}.json`), "utf8"));
    const abi = JSON.parse(readFileSync(path.join(root, `backend/contracts/${name}.sample.abi.json`), "utf8"));
    assert.deepEqual(abi, artifact.abi, `${name} backend ABI must match`);
    assert.doesNotMatch(JSON.stringify(abi), /bloodType|InvalidBloodType/);
    const contract = await new ethers.ContractFactory(abi, artifact.bytecode, admin).deploy(admin.address);
    await contract.waitForDeployment();
    return contract;
  }
  const certificate = await deploy("BloodCertificate");
  const registry = await deploy("DonationRegistry");
  const deployment = await certificate.deploymentTransaction().wait();
  const apiEnv = { ...process.env, PORT: String(apiPort), SEPOLIA_RPC_URL: rpcUrl, CHAIN_ID: "31337",
    BACKEND_SIGNER_PRIVATE_KEY: admin.privateKey, CERTIFICATE_CONTRACT_ADDRESS: await certificate.getAddress(),
    DONATION_CONTRACT_ADDRESS: await registry.getAddress(), CERTIFICATE_DEPLOY_BLOCK: String(deployment.blockNumber),
    CERTIFICATE_DB_PATH: path.join(temp, "certificates.sqlite"), BLOOD_CENTER_NAME: "Integration Center" };
  async function startApi() {
    api = startNode(["src/server.js"], path.join(root, "backend"), apiEnv);
    await waitReady(async () => (await fetch(`${apiUrl}/health`)).ok, api);
  }
  await startApi();
  const bundled = await build({ entryPoints: [path.join(root, "frontend/src/api/certificate.ts")], bundle: true,
    write: false, format: "esm", platform: "browser", define: { "import.meta.env": JSON.stringify({
      VITE_API_BASE_URL: apiUrl, VITE_DEMO_MODE: "false", VITE_CERTIFICATE_CONTRACT_ADDRESS: await certificate.getAddress(),
      VITE_CHAIN_ID: "0x7a69" }) } });
  const frontend = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
  let wallet = donor;
  let chainId = "0x1";
  let switchCount = 0;
  let lastData;
  globalThis.window = { ethereum: { async request({ method, params }) {
    if (method === "eth_chainId") return chainId;
    if (method === "wallet_switchEthereumChain") { chainId = params[0].chainId; switchCount++; return null; }
    if (method === "eth_sendTransaction") {
      assert.equal(params[0].from.toLowerCase(), wallet.address.toLowerCase());
      lastData = params[0].data;
      const { from, ...transaction } = params[0];
      return (await wallet.sendTransaction(transaction)).hash;
    }
    return provider.send(method, params || []);
  } } };
  async function post(route, body, key = "integration-invalid-0001") {
    return fetch(`${apiUrl}${route}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
  }
  const input = { to: donor.address, donationType: "WHOLE_BLOOD", volumeMl: 400, requestId: "integration-issue-0001" };
  let issued;
  await t.test("real frontend issue request succeeds and persists off-chain fields", async () => {
    issued = await frontend.issueCertificate(input);
    assert.equal(issued.certificate.donationType, "WHOLE_BLOOD");
    assert.equal(issued.certificate.volumeMl, 400);
    assert.equal(issued.certificate.issuer, "Integration Center");
    assert.equal(issued.certificate.status, "active");
    assert.equal(issued.certificate.history[0].type, "issued");
    assert.equal(await certificate.ownerOf(issued.certificate.tokenId), donor.address);
    const raw = await (await fetch(`${apiUrl}/certificate/${issued.certificate.tokenId}`)).json();
    assert.equal("bloodType" in raw, false);
    assert.equal("rh" in raw, false);
    const tx = await provider.getTransaction(issued.txHash);
    const parsed = certificate.interface.parseTransaction(tx);
    assert.equal(parsed.args.length, 2, "only recipient and issuer go on chain");
  });
  await t.test("retries including concurrent requests mint only once", async () => {
    const results = await Promise.all([frontend.issueCertificate(input), frontend.issueCertificate(input)]);
    assert.ok(results.every((result) => result.txHash === issued.txHash));
    assert.equal(await certificate.balanceOf(donor.address), 1n);
    const conflict = await post("/certificate/issue", { to: donor.address, donationType: "WHOLE_BLOOD", volumeMl: 320 }, input.requestId);
    assert.equal(conflict.status, 409);
  });
  await t.test("restart retains metadata and issuance idempotency", async () => {
    await stop(api);
    await startApi();
    const retried = await frontend.issueCertificate(input);
    assert.equal(retried.txHash, issued.txHash);
    assert.equal(retried.certificate.volumeMl, 400);
  });
  await t.test("rejects old blood-type payloads and invalid donation metadata", async () => {
    for (const body of [
      { to: donor.address, bloodType: "A" },
      { to: donor.address, donationType: "WHOLE_BLOOD" },
      { to: donor.address, donationType: "WHOLE_BLOOD", volumeMl: 500 },
      { to: donor.address, donationType: "PLASMA", volumeMl: 320 },
      { to: donor.address, donationType: "OTHER" },
    ]) assert.equal((await post("/certificate/issue", body)).status, 400);
    assert.equal(await certificate.balanceOf(donor.address), 1n);
  });
  await t.test("frontend list/verify and wallet safeTransferFrom share the same ABI", async () => {
    const tokenId = issued.certificate.tokenId;
    assert.equal((await frontend.listCertificates(donor.address)).length, 1);
    assert.equal((await frontend.verifyCertificate(tokenId)).status, "valid");
    const transferred = await frontend.transferCertificate({ tokenId, from: donor.address, to: recipient.address });
    assert.equal(switchCount, 1, "wrong wallet network must switch before sending");
    assert.equal(lastData, certificate.interface.encodeFunctionData("safeTransferFrom(address,address,uint256)", [donor.address, recipient.address, tokenId]));
    assert.equal(transferred.certificate.owner, recipient.address);
    assert.equal(transferred.certificate.volumeMl, 400);
    assert.equal((await frontend.listCertificates(donor.address)).length, 0);
    assert.equal((await frontend.listCertificates(recipient.address)).length, 1);
    assert.equal(transferred.certificate.history.at(-1).type, "transferred");
  });
  await t.test("use blocks duplicate use and all later transfers", async () => {
    const tokenId = issued.certificate.tokenId;
    assert.equal((await frontend.markCertificateUsed(tokenId, "Integration Hospital")).certificate.status, "used");
    assert.equal((await frontend.verifyCertificate(tokenId)).status, "used");
    await assert.rejects(frontend.markCertificateUsed(tokenId, "Other Hospital"), (error) => error.status === 409);
    wallet = recipient;
    await assert.rejects(frontend.transferCertificate({ tokenId, from: recipient.address, to: donor.address }));
    assert.equal(await certificate.ownerOf(tokenId), recipient.address);
  });
  await t.test("component donation omits volume and missing tokens return notfound", async () => {
    const plasma = await frontend.issueCertificate({ to: donor.address, donationType: "PLASMA", requestId: "integration-plasma-0001" });
    assert.equal(plasma.certificate.donationType, "PLASMA");
    assert.equal("volumeMl" in plasma.certificate, false);
    assert.equal((await frontend.verifyCertificate("999999")).status, "notfound");
  });
  await t.test("donation registry API records no blood type", async () => {
    const message = "integration donation";
    const signature = await donor.signMessage(message);
    const response = await post("/donation/auth", { address: donor.address, message, signature });
    assert.equal(response.status, 200);
    const record = await response.json();
    assert.equal("bloodType" in record, false);
    assert.equal(await registry.verify(record.donationHash), true);
    assert.equal(await registry.query(record.donationHash), BigInt(record.timestamp));
    const detail = await (await fetch(`${apiUrl}/donation/${record.donationHash}`)).json();
    assert.equal("bloodType" in detail, false);
  });
  await t.test("recovers a saved transaction before broadcast and after mining without minting twice", async () => {
    process.env.CERTIFICATE_DB_PATH = apiEnv.CERTIFICATE_DB_PATH;
    const { prepareIssuance } = await import("../src/services/certificateStore.js");
    const scope = `31337:${(await certificate.getAddress()).toLowerCase()}`;
    for (const broadcastFirst of [false, true]) {
      const requestId = `integration-recovery-${broadcastFirst}`;
      const body = { to: donor.address.toLowerCase(), donationType: "PLATELETS" };
      const unsigned = await certificate.issue.populateTransaction(donor.address, "Integration Center");
      const raw = await admin.signTransaction(await admin.populateTransaction(unsigned));
      const txHash = ethers.keccak256(raw);
      prepareIssuance(scope, requestId, JSON.stringify(body), raw, txHash);
      if (!broadcastFirst) {
        const message = "pending nonce test";
        const blocked = await post("/donation/auth", { address: donor.address, message, signature: await donor.signMessage(message) });
        assert.equal(blocked.status, 409, "record must not consume a saved issue transaction's nonce");
      }
      if (broadcastFirst) await (await provider.broadcastTransaction(raw)).wait();
      await stop(api);
      await startApi();
      const restored = await frontend.issueCertificate({ ...body, requestId });
      assert.equal(restored.txHash, txHash);
      assert.equal(restored.certificate.donationType, "PLATELETS");
      const replay = await frontend.issueCertificate({ ...body, requestId });
      assert.equal(replay.certificate.tokenId, restored.certificate.tokenId);
    }
  });
  await t.test("OpenAPI documents current payload and required retry key", async () => {
    const spec = await (await fetch(`${apiUrl}/openapi.json`)).json();
    assert.ok(spec.paths["/certificate/issue"].post.parameters.some((p) => p.name === "Idempotency-Key"));
    assert.equal("bloodType" in spec.components.schemas.CertificateIssueRequest.properties, false);
  });
});
