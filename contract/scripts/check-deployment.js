const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

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
      if ((await provider.getCode(address)).toLowerCase() !== artifact.deployedBytecode.toLowerCase()) throw new Error(`${name} bytecode mismatch`);
      const contract = new ethers.Contract(address, artifact.abi, provider);
      if (!await contract.hasRole(await contract[role](), wallet.address)) throw new Error(`${name} role missing`);
      checks.push({ name, address, bytecodeMatches: true, roleGranted: true });
    }
    console.log(JSON.stringify({ checks, balanceEth: ethers.formatEther(await provider.getBalance(wallet.address)), frontendConfigured: frontend.VITE_DEMO_MODE === "false" }, null, 2));
  } finally { provider.destroy(); }
}
main().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
