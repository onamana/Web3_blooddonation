import { Router } from "express";
import { ethers } from "ethers";
import { getCertificateContract } from "../config/chain.js";
import { verifyWalletSignature } from "../utils/verifySignature.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  certificateOwnerQuerySchema,
  certificateTokenParamSchema,
  certificateTransferBodySchema,
  certificateUseBodySchema,
} from "../schemas/certificate.js";
import { CODE_TO_BLOOD_TYPE } from "../utils/bloodTypeMap.js";

const router = Router();

/**
 * 헌혈 증서(ERC-721) 라우트.
 *
 * 이력 타임라인은 우리가 따로 저장하지 않는다. ERC-721이 전송마다 Transfer 이벤트를
 * 자동으로 남기므로 로그를 읽어 재구성하기만 하면 된다(발급 = from이 zero address인 Transfer).
 * 사용 처리만 컨트랙트의 CertificateUsed 이벤트를 추가로 합친다.
 */

function notImplemented(res) {
  return res.status(501).json({
    error: "CERTIFICATE_CONTRACT_ADDRESS not configured yet — waiting on A's contract",
  });
}

function isConfigured() {
  return Boolean(process.env.CERTIFICATE_CONTRACT_ADDRESS);
}

async function eventTimestamp(log) {
  const block = await log.getBlock();
  return Number(block.timestamp);
}

/** Transfer + CertificateUsed 로그를 시간순 이력으로 합친다. */
async function loadHistory(contract, tokenId) {
  const [transfers, uses] = await Promise.all([
    contract.queryFilter(contract.filters.Transfer(null, null, tokenId)),
    contract.queryFilter(contract.filters.CertificateUsed(tokenId)),
  ]);

  const transferEvents = await Promise.all(
    transfers.map(async (log) => ({
      type: log.args.from === ethers.ZeroAddress ? "issued" : "transferred",
      timestamp: await eventTimestamp(log),
      from: log.args.from === ethers.ZeroAddress ? null : log.args.from,
      to: log.args.to,
      org: null,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    }))
  );

  const useEvents = uses.map((log) => ({
    type: "used",
    timestamp: Number(log.args.timestamp),
    from: null,
    to: null,
    org: log.args.hospital,
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
  }));

  return [...transferEvents, ...useEvents].sort((a, b) => a.timestamp - b.timestamp);
}

async function loadCertificate(contract, tokenId) {
  const [owner, info, history] = await Promise.all([
    contract.ownerOf(tokenId),
    contract.certificateInfo(tokenId),
    loadHistory(contract, tokenId),
  ]);

  return {
    tokenId: String(tokenId),
    owner,
    bloodType: CODE_TO_BLOOD_TYPE[Number(info.bloodType)],
    issuedAt: Number(info.issuedAt),
    issuer: info.issuer,
    status: info.used ? "used" : "active",
    usedAt: info.used ? Number(info.usedAt) : null,
    usedBy: info.used ? info.usedBy : null,
    history,
  };
}

// 지갑이 현재 보유한 증서 목록. Transfer 이벤트의 indexed `to` 로 필터링해 후보를 좁힌 뒤
// ownerOf로 현재 소유자만 남긴다 (별도 인덱서 없이 RPC만으로 가능한 범위).
router.get("/", validateQuery(certificateOwnerQuerySchema), asyncHandler(async (req, res) => {
  if (!isConfigured()) return notImplemented(res);

  const { owner } = res.locals.query;
  const contract = getCertificateContract();
  const received = await contract.queryFilter(contract.filters.Transfer(null, owner));
  const candidates = [...new Set(received.map((log) => log.args.tokenId.toString()))];

  const owned = [];
  for (const tokenId of candidates) {
    const currentOwner = await contract.ownerOf(tokenId);
    if (currentOwner.toLowerCase() === owner.toLowerCase()) {
      owned.push(await loadCertificate(contract, tokenId));
    }
  }

  res.json({ certificates: owned.sort((a, b) => b.issuedAt - a.issuedAt) });
}));

router.get("/:tokenId", validateParams(certificateTokenParamSchema), asyncHandler(async (req, res) => {
  if (!isConfigured()) return notImplemented(res);

  const contract = getCertificateContract();
  res.json(await loadCertificate(contract, req.params.tokenId));
}));

// 병원 검증: 존재 여부 + 이중사용 여부 판정. 프론트의 "검증 실패" 화면이 status를 보고 갈린다.
router.get("/:tokenId/verify", validateParams(certificateTokenParamSchema), asyncHandler(async (req, res) => {
  if (!isConfigured()) return notImplemented(res);

  const { tokenId } = req.params;
  const contract = getCertificateContract();

  let certificate;
  try {
    certificate = await loadCertificate(contract, tokenId);
  } catch {
    return res.json({ tokenId, status: "notfound", certificate: null });
  }

  res.json({
    tokenId,
    status: certificate.status === "used" ? "used" : "valid",
    certificate,
  });
}));

// 양도: 소유자가 지갑으로 서명한 메시지를 검증한 뒤 백엔드 릴레이어가 transferFrom을 보낸다.
// TODO: 프론트에서 직접 지갑으로 transferFrom을 보내는 방식으로 바꿀 수 있으면 이 릴레이는 걷어낸다.
router.post(
  "/:tokenId/transfer",
  validateParams(certificateTokenParamSchema),
  validateBody(certificateTransferBodySchema),
  asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const { from, to, message, signature } = req.body;

    if (!verifyWalletSignature({ message, signature, claimedAddress: from })) {
      return res.status(401).json({ error: "signature verification failed" });
    }
    if (!isConfigured()) return notImplemented(res);

    const contract = getCertificateContract({ withSigner: true });
    const currentOwner = await contract.ownerOf(tokenId);
    if (currentOwner.toLowerCase() !== from.toLowerCase()) {
      return res.status(403).json({ error: "not the current owner of this certificate" });
    }
    if (await contract.isUsed(tokenId)) {
      return res.status(409).json({ error: "already used certificate cannot be transferred" });
    }

    const tx = await contract.transferFrom(from, to, tokenId);
    await tx.wait();

    res.json({ txHash: tx.hash, certificate: await loadCertificate(contract, tokenId) });
  })
);

// 사용 처리: 이미 사용된 증서면 409로 막는다 (이중사용 차단).
router.post(
  "/:tokenId/use",
  validateParams(certificateTokenParamSchema),
  validateBody(certificateUseBodySchema),
  asyncHandler(async (req, res) => {
    if (!isConfigured()) return notImplemented(res);

    const { tokenId } = req.params;
    const contract = getCertificateContract({ withSigner: true });

    if (await contract.isUsed(tokenId)) {
      return res.status(409).json({
        error: "already used",
        detail: "이 증서는 이미 사용 처리되었습니다.",
      });
    }

    const tx = await contract.markUsed(tokenId, req.body.hospital);
    await tx.wait();

    res.json({ txHash: tx.hash, certificate: await loadCertificate(contract, tokenId) });
  })
);

export default router;
