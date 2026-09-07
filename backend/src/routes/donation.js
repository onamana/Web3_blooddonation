import { Router } from "express";
import { ethers } from "ethers";
import { getDonationContract } from "../config/chain.js";
import { verifyWalletSignature } from "../utils/verifySignature.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { donationAuthBodySchema, donationHashParamSchema } from "../schemas/donation.js";

const router = Router();

// 헌혈 인증 요청: 프론트가 지갑 서명 + 헌혈 정보를 보내면
// 1) 서명 검증 2) 익명 해시 생성 3) A의 컨트랙트에 record 호출
// TODO: A의 실제 ABI/주소 연동 전까지는 501로 응답
router.post("/auth", validateBody(donationAuthBodySchema), asyncHandler(async (req, res) => {
  const { address, message, signature, bloodType } = req.body;

  const isValid = verifyWalletSignature({ message, signature, claimedAddress: address });
  if (!isValid) {
    return res.status(401).json({ error: "signature verification failed" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const donationHash = ethers.keccak256(
    ethers.toUtf8Bytes(`${address}:${timestamp}:${bloodType}`)
  );

  if (!process.env.DONATION_CONTRACT_ADDRESS) {
    return res.status(501).json({
      error: "DONATION_CONTRACT_ADDRESS not configured yet — waiting on A's contract",
      wouldRecord: { donationHash, timestamp, bloodType },
    });
  }

  const contract = getDonationContract({ withSigner: true });
  const tx = await contract.record(donationHash, timestamp, bloodType);
  await tx.wait();

  res.json({ donationHash, timestamp, bloodType, txHash: tx.hash });
}));

router.get("/verify/:hash", validateParams(donationHashParamSchema), asyncHandler(async (req, res) => {
  const contract = getDonationContract();
  const verified = await contract.verify(req.params.hash);
  res.json({ donationHash: req.params.hash, verified });
}));

router.get("/:hash", validateParams(donationHashParamSchema), asyncHandler(async (req, res) => {
  const contract = getDonationContract();
  const [timestamp, bloodType] = await contract.query(req.params.hash);
  res.json({ donationHash: req.params.hash, timestamp: Number(timestamp), bloodType });
}));

export default router;
