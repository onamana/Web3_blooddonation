import { Router } from "express";
import { ethers } from "ethers";
import { randomBytes } from "node:crypto";
import { withChainWrite } from "../services/chainWrites.js";
import { getDonationContract } from "../config/chain.js";
import { verifyWalletSignature } from "../utils/verifySignature.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { donationAuthBodySchema, donationHashParamSchema } from "../schemas/donation.js";

const router = Router();

// 헌혈 인증 요청: 프론트가 지갑 서명 + 헌혈 정보를 보내면
// 1) 서명 검증 2) 익명 해시 생성 3) A의 컨트랙트에 record 호출
// 지갑 주소나 검사정보를 추측 가능한 해시로 만들지 않고 무작위 기록 식별자를 사용한다.
router.post("/auth", validateBody(donationAuthBodySchema), asyncHandler(async (req, res) => {
  const { address, message, signature } = req.body;

  const isValid = verifyWalletSignature({ message, signature, claimedAddress: address });
  if (!isValid) {
    return res.status(401).json({ error: "signature verification failed" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const donationHash = ethers.keccak256(randomBytes(32));

  if (!process.env.DONATION_CONTRACT_ADDRESS) {
    return res.status(501).json({
      error: "DONATION_CONTRACT_ADDRESS not configured yet — waiting on A's contract",
      wouldRecord: { donationHash, timestamp },
    });
  }

  const contract = getDonationContract({ withSigner: true });
  const tx = await withChainWrite(async () => {
    const transaction = await contract.record(donationHash, timestamp);
    await transaction.wait();
    return transaction;
  });

  res.json({ donationHash, timestamp, txHash: tx.hash });
}));

router.get("/verify/:hash", validateParams(donationHashParamSchema), asyncHandler(async (req, res) => {
  const contract = getDonationContract();
  const verified = await contract.verify(req.params.hash);
  res.json({ donationHash: req.params.hash, verified });
}));

router.get("/:hash", validateParams(donationHashParamSchema), asyncHandler(async (req, res) => {
  const contract = getDonationContract();
  const timestamp = await contract.query(req.params.hash);
  res.json({
    donationHash: req.params.hash,
    timestamp: Number(timestamp),
  });
}));

export default router;
