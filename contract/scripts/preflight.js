const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { ethers } = require("ethers");
dotenv.config({ path: path.join(__dirname, "../.env") });

async function preflight() {
  const missing = ["SEPOLIA_RPC_URL", "DEPLOYER_PRIVATE_KEY", "BACKEND_SIGNER_ADDRESS"]
    .filter((key) => !process.env[key]);
  const backendFile = path.join(__dirname, "../../backend/.env");
  const backendEnv = fs.existsSync(backendFile) ? dotenv.parse(fs.readFileSync(backendFile)) : {};
  if (!backendEnv.BACKEND_SIGNER_PRIVATE_KEY) missing.push("backend/.env: BACKEND_SIGNER_PRIVATE_KEY");
  if (!backendEnv.SEPOLIA_RPC_URL) missing.push("backend/.env: SEPOLIA_RPC_URL");
  if (missing.length) throw new Error(`Missing settings: ${missing.join(", ")}`);
  let deployer, backend;
  try {
    deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
    backend = new ethers.Wallet(backendEnv.BACKEND_SIGNER_PRIVATE_KEY);
  } catch { throw new Error("Invalid deployer/backend private key format (values hidden)."); }
  if (!ethers.isAddress(process.env.BACKEND_SIGNER_ADDRESS) || backend.address.toLowerCase() !== process.env.BACKEND_SIGNER_ADDRESS.toLowerCase()) {
    throw new Error("BACKEND_SIGNER_ADDRESS does not match backend signer.");
  }
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, undefined, { batchMaxCount: 1 });
  const backendProvider = new ethers.JsonRpcProvider(backendEnv.SEPOLIA_RPC_URL, undefined, { batchMaxCount: 1 });
  try {
    const networks = await Promise.all([provider.getNetwork(), backendProvider.getNetwork()]);
    if (networks.some((network) => network.chainId !== 11155111n)) throw new Error("Both RPC URLs must point to Sepolia (11155111).");
    const [balance, backendBalance, fees] = await Promise.all([
      provider.getBalance(deployer.address), provider.getBalance(backend.address), provider.getFeeData(),
    ]);
    if (backendBalance === 0n) throw new Error("Backend signer needs Sepolia test ETH.");
    let gas = 0n;
    for (const name of ["BloodCertificate", "DonationRegistry"]) {
      const artifact = require(`../artifacts/contracts/${name}.sol/${name}.json`);
      if (JSON.stringify(artifact.abi).includes("bloodType")) throw new Error(`${name}: stale ABI still has bloodType.`);
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer.connect(provider));
      const tx = await factory.getDeployTransaction(deployer.address);
      gas += await provider.estimateGas({ ...tx, from: deployer.address });
    }
    // Include two role grants and headroom. This is a bound, not an exact fee quote.
    const budget = (gas + 200000n) * (fees.maxFeePerGas || fees.gasPrice) * 12n / 10n;
    if (balance < budget) throw new Error(`Insufficient Sepolia ETH. Estimated deployment budget: ${ethers.formatEther(budget)} ETH.`);
    console.log(JSON.stringify({ chainId: "11155111", deployer: deployer.address, backendSigner: backend.address,
      balanceEth: ethers.formatEther(balance), estimatedBudgetEth: ethers.formatEther(budget) }, null, 2));
    return { deployer: deployer.address, backendSigner: backend.address };
  } finally { provider.destroy(); backendProvider.destroy(); }
}

module.exports = { preflight };
if (require.main === module) preflight().catch((error) => {
  // Ethers errors may contain RPC credentials. Only show our own validation text.
  console.error(error.code ? `RPC preflight failed (${error.code}); credentials hidden.` : error.message);
  process.exitCode = 1;
});
