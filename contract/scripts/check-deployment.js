const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

function immutableReferencesFor(name) {
  const buildInfoDir = path.join(__dirname, "../artifacts/build-info");
  for (const file of fs.readdirSync(buildInfoDir)) {
    const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, file)));
    const contract = buildInfo.output.contracts?.[`contracts/${name}.sol`]?.[name];
    if (contract) return contract.evm.deployedBytecode.immutableReferences || {};
  }
  return {};
}

/** Constructor immutables (EIP-712 domain values 등)는 배포 주소마다 달라진다. */
function normalizeRuntimeBytecode(bytecode, immutableReferences) {
  let normalized = bytecode.toLowerCase();
  for (const references of Object.values(immutableReferences)) {
    for (const { start, length } of references) {
      const offset = 2 + start * 2;
      normalized = `${normalized.slice(0, offset)}${"0".repeat(length * 2)}${normalized.slice(offset + length * 2)}`;
    }
  }
  return normalized;
}

async function main() {
  const root = path.resolve(__dirname, "../..");
  const backend = dotenv.parse(fs.readFileSync(path.join(root, "backend/.env")));
  const frontend = dotenv.parse(fs.readFileSync(path.join(root, "frontend/.env")));
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, 11155111, { batchMaxCount: 1 });
  try {
    if (frontend.VITE_CERTIFICATE_CONTRACT_ADDRESS !== backend.CERTIFICATE_CONTRACT_ADDRESS) throw new Error("Frontend/backend addresses differ");
    const wallet = new ethers.Wallet(backend.BACKEND_SIGNER_PRIVATE_KEY);
    const checks = [];
    for (const [name, address, role] of [
      ["BloodCertificate", backend.CERTIFICATE_CONTRACT_ADDRESS, "ISSUER_ROLE"],
      ["DonationRegistry", backend.DONATION_CONTRACT_ADDRESS, "RECORDER_ROLE"],
    ]) {
      const artifact = require(`../artifacts/contracts/${name}.sol/${name}.json`);
      const deployed = await provider.getCode(address);
      if (normalizeRuntimeBytecode(deployed, immutableReferencesFor(name)) !== normalizeRuntimeBytecode(artifact.deployedBytecode, immutableReferencesFor(name))) {
        throw new Error(`${name} bytecode mismatch`);
      }
      const contract = new ethers.Contract(address, artifact.abi, provider);
      if (!await contract.hasRole(await contract[role](), wallet.address)) throw new Error(`${name} role missing`);
      checks.push({ name, address, bytecodeMatches: true, roleGranted: true });
    }
    console.log(JSON.stringify({ checks, balanceEth: ethers.formatEther(await provider.getBalance(wallet.address)), frontendConfigured: frontend.VITE_DEMO_MODE === "false" }, null, 2));
  } finally { provider.destroy(); }
}
main().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
