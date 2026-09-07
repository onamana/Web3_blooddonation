import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A가 실제 컨트랙트를 배포하면 이 ABI 파일을 실제 ABI로 교체하세요.
const abiPath = path.join(__dirname, "../../contracts/DonationRegistry.sample.abi.json");
export const donationRegistryAbi = JSON.parse(readFileSync(abiPath, "utf-8"));

export function getProvider() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is not set in .env");
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getSigner() {
  const key = process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!key) throw new Error("BACKEND_SIGNER_PRIVATE_KEY is not set in .env");
  return new ethers.Wallet(key, getProvider());
}

export function getDonationContract({ withSigner = false } = {}) {
  const address = process.env.DONATION_CONTRACT_ADDRESS;
  if (!address) throw new Error("DONATION_CONTRACT_ADDRESS is not set in .env");
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(address, donationRegistryAbi, runner);
}
