import { ethers } from "ethers";

// 프론트(MetaMask)가 `message`에 서명해서 보낸 걸 백엔드가 검증.
// 서명자 주소가 claimedAddress와 일치하면 본인 확인 성공.
export function verifyWalletSignature({ message, signature, claimedAddress }) {
  const recoveredAddress = ethers.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === claimedAddress.toLowerCase();
}
