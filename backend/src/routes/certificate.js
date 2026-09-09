import { Router } from "express";
import { ethers } from "ethers";
import { getCertificateContract } from "../config/chain.js";
import { verifyWalletSignature } from "../utils/verifySignature.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  certificateIssueBodySchema,
  certificateOwnerQuerySchema,
  certificateTokenParamSchema,
  certificateTransferBodySchema,
  certificateUseBodySchema,
} from "../schemas/certificate.js";
import { BLOOD_TYPE_TO_CODE, CODE_TO_BLOOD_TYPE } from "../utils/bloodTypeMap.js";

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

/**
 * 발급기관 명. 발급 요청 본문이 아니라 서버 설정에서만 온다.
 * 다중 혈액원 지원은 MVP 스코프 밖이라 지금은 단일 값으로 둔다(프론트 HOSPITAL_NAME과 같은 처지).
 */
const BLOOD_CENTER_NAME = process.env.BLOOD_CENTER_NAME || "대전혈액원";

/**
 * 발급 트랜잭션에서 새 tokenId를 찾는다.
 *
 * `issue()`가 tokenId를 return하지만 상태를 바꾸는 호출의 반환값은 오프체인에서 읽을 수 없다.
 * 대신 영수증의 발급 Transfer(from이 zero address) 로그에서 꺼낸다 — 이력 재구성이 쓰는 것과 같은 신호.
 */
function findIssuedTokenId(contract, receipt) {
  for (const log of receipt.logs) {
    let parsed;
    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue; // 이 컨트랙트의 이벤트가 아닌 로그
    }
    if (parsed?.name === "Transfer" && parsed.args.from === ethers.ZeroAddress) {
      return String(parsed.args.tokenId);
    }
  }
  return null;
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

// 발급: 혈액원이 헌혈자 지갑으로 새 증서(ERC-721)를 민팅한다.
//
// 양도/사용과 권한 구조가 다르다. 양도는 소유자의 지갑 서명으로 권한을 증명하지만,
// 발급은 아직 소유자가 없어서 서명할 사람이 없다. 따라서 권한의 원천은 "지갑 서명"이 아니라
// "혈액원이라는 기관"이어야 한다.
//
// TODO(A 협의): 컨트랙트에 발급자 롤(onlyIssuer / AccessControl)을 두고 백엔드 signer를 등록해야
// 한다. 이게 없으면 누구나 증서를 찍어낼 수 있고 그러면 /verify 화면 전체가 무의미해진다.
// TODO(C): 혈액원 직원 인증. 지금 이 라우트는 무인증이라 데모 전용이다.
router.post(
  "/issue",
  validateBody(certificateIssueBodySchema),
  asyncHandler(async (req, res) => {
    if (!isConfigured()) return notImplemented(res);

    const { to, bloodType } = req.body;
    const contract = getCertificateContract({ withSigner: true });

    const tx = await contract.issue(to, BLOOD_TYPE_TO_CODE[bloodType], BLOOD_CENTER_NAME);
    const receipt = await tx.wait();

    const tokenId = findIssuedTokenId(contract, receipt);
    if (tokenId === null) {
      return res.status(502).json({
        error: "issued tokenId not found",
        detail: "발급 트랜잭션에 Transfer(0x0 → to) 로그가 없습니다.",
      });
    }

    res.json({ txHash: tx.hash, certificate: await loadCertificate(contract, tokenId) });
  })
);

export default router;
