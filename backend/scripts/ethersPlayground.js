import "dotenv/config";
import { ethers } from "ethers";
import { getProvider, getSigner, getDonationContract } from "../src/config/chain.js";

// 단계 ②: ethers.js 연습용 스크립트. `npm run ethers:playground`로 실행.
async function main() {
  const provider = getProvider();
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  console.log(`connected to ${network.name} (chainId ${network.chainId}), block ${blockNumber}`);

  const signer = getSigner();
  const balance = await provider.getBalance(signer.address);
  console.log(`signer address: ${signer.address}, balance: ${ethers.formatEther(balance)} ETH`);

  if (!process.env.DONATION_CONTRACT_ADDRESS) {
    console.log("DONATION_CONTRACT_ADDRESS not set yet — skipping contract call practice");
    return;
  }

  const contract = getDonationContract();
  const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
  const verified = await contract.verify(dummyHash);
  console.log(`verify(${dummyHash}) => ${verified}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
