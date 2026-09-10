// Explicit opt-in bootstrap for a NEW disposable testnet wallet. Never prints keys
// and never overwrites an existing environment file.
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const root = path.resolve(__dirname, "../..");
const rpc = "https://ethereum-sepolia-rpc.publicnode.com";

async function main() {
  const targets = ["contract/.env", "backend/.env", "frontend/.env"];
  const existing = targets.filter((file) => fs.existsSync(path.join(root, file)));
  if (existing.length) throw new Error(`Refusing to overwrite existing files: ${existing.join(", ")}`);
  const response = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (data.result !== "0xaa36a7") throw new Error("Public RPC did not confirm Sepolia. No wallet files created.");
  const wallet = ethers.Wallet.createRandom();
  const configurations = [
    `# Disposable Sepolia demo wallet. Never use for real assets or commit this file.\nSEPOLIA_RPC_URL=${rpc}\nDEPLOYER_PRIVATE_KEY=${wallet.privateKey}\nBACKEND_SIGNER_ADDRESS=${wallet.address}\nETHERSCAN_API_KEY=\n`,
    `PORT=4000\nCHAIN_ID=11155111\nSEPOLIA_RPC_URL=${rpc}\nBACKEND_SIGNER_PRIVATE_KEY=${wallet.privateKey}\nCERTIFICATE_CONTRACT_ADDRESS=\nCERTIFICATE_DEPLOY_BLOCK=\nDONATION_CONTRACT_ADDRESS=\nBLOOD_CENTER_NAME=대전혈액원\nDID_MODULE_BASE_URL=\n`,
    "VITE_API_BASE_URL=http://localhost:4000\nVITE_DEMO_MODE=false\nVITE_CHAIN_ID=0xaa36a7\nVITE_EXPLORER_BASE_URL=https://sepolia.etherscan.io\nVITE_CERTIFICATE_CONTRACT_ADDRESS=\n",
  ];
  targets.forEach((file, i) => fs.writeFileSync(path.join(root, file), configurations[i], { flag: "wx", mode: 0o600 }));
  console.log(JSON.stringify({ address: wallet.address, chainId: 11155111, rpc, filesCreated: targets,
    next: "Fund this public address with Sepolia test ETH, then run preflight:sepolia." }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
