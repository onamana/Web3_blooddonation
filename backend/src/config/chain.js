import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A가 실제 컨트랙트를 배포하면 이 ABI 파일들을 실제 ABI로 교체하세요.
const abiPath = path.join(__dirname, "../../contracts/DonationRegistry.sample.abi.json");
export const donationRegistryAbi = JSON.parse(readFileSync(abiPath, "utf-8"));

const certificateAbiPath = path.join(__dirname, "../../contracts/BloodCertificate.sample.abi.json");
export const bloodCertificateAbi = JSON.parse(readFileSync(certificateAbiPath, "utf-8"));

/**
 * ethers v6는 기본적으로 짧은 시간 안에 몰린 여러 요청을 하나의 HTTP 배치 요청으로 묶어 보낸다.
 * 무료 티어 Infura는 이 배치 안의 항목 일부만 골라 "-32005 Too Many Requests"로 거부하는데,
 * 개별 요청은 멀쩡히 성공한다 — 즉 진짜 rate limit이 아니라 배치 자체가 문제다.
 * `batchMaxCount: 1`로 배치를 꺼서 모든 요청을 개별 HTTP 호출로 보낸다.
 */
export function getProvider() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is not set in .env");
  return new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 1 });
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

/** 헌혈 증서(ERC-721) 컨트랙트. 이력 타임라인은 Transfer/CertificateUsed 이벤트 로그에서 재구성한다. */
export function getCertificateContract({ withSigner = false } = {}) {
  const address = process.env.CERTIFICATE_CONTRACT_ADDRESS;
  if (!address) throw new Error("CERTIFICATE_CONTRACT_ADDRESS is not set in .env");
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(address, bloodCertificateAbi, runner);
}
