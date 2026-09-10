import { Router } from "express";
import { ethers } from "ethers";
import { getCertificateContract } from "../config/chain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  certificateIssueBodySchema,
  certificateOwnerQuerySchema,
  certificateTokenParamSchema,
  certificateUseBodySchema,
} from "../schemas/certificate.js";
import { certificateMetadata, findIssuance, prepareIssuance, confirmIssuance, pendingIssuances } from "../services/certificateStore.js";
import { withChainWrite } from "../services/chainWrites.js";

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
 * 이벤트 로그 조회의 시작 블록. 컨트랙트가 배포된 블록보다 이전은 뒤질 필요가 없고,
 * 일부 RPC(Infura 등)는 eth_getLogs의 블록 범위를 통째로 제한하기 때문에 fromBlock을
 * 0(earliest)으로 두면 "range exceeds limit" 에러로 죽는다.
 */
const CERTIFICATE_DEPLOY_BLOCK = Number(process.env.CERTIFICATE_DEPLOY_BLOCK || 0);

/**
 * 발급기관 명. 발급 요청 본문이 아니라 서버 설정에서만 온다.
 * 다중 혈액원 지원은 MVP 스코프 밖이라 지금은 단일 값으로 둔다(프론트 HOSPITAL_NAME과 같은 처지).
 */
const BLOOD_CENTER_NAME = process.env.BLOOD_CENTER_NAME || "대전혈액원";

async function certificateScope(contract) {
  const provider = contract.runner.provider || contract.runner;
  const { chainId } = await provider.getNetwork();
  return `${chainId}:${(await contract.getAddress()).toLowerCase()}`;
}

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
    contract.queryFilter(contract.filters.Transfer(null, null, tokenId), CERTIFICATE_DEPLOY_BLOCK),
    contract.queryFilter(contract.filters.CertificateUsed(tokenId), CERTIFICATE_DEPLOY_BLOCK),
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
    ...certificateMetadata(await certificateScope(contract), String(tokenId)),
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
  const received = await contract.queryFilter(contract.filters.Transfer(null, owner), CERTIFICATE_DEPLOY_BLOCK);
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
  } catch (error) {
    const name = error.revert?.name;
    if (name !== "ERC721NonexistentToken" && name !== "CertificateDoesNotExist") throw error;
    return res.json({ tokenId, status: "notfound", certificate: null });
  }

  res.json({
    tokenId,
    status: certificate.status === "used" ? "used" : "valid",
    certificate,
  });
}));

// 양도: relayer 릴레이 방식은 걷어냈다. ERC-721에서 relayer가 transferFrom을 보내려면
// 소유자가 미리 approve()/setApprovalForAll()을 해야 하는데 그 단계가 없으면 항상
// ERC721InsufficientApproval로 revert된다. 지금은 프론트 지갑이 직접
// safeTransferFrom()을 호출하고(frontend/src/api/certificate.ts), 그 tx가 컨트랙트에
// 반영된 뒤 GET /:tokenId 로 최신 소유자/이력을 다시 읽어오면 된다 — 별도 백엔드 라우트가
// 필요 없다. 사용된 증서의 양도 차단도 이제 온체인(_update override)에서 강제한다.

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

    const tx = await withChainWrite(async () => {
      const transaction = await contract.markUsed(tokenId, req.body.hospital);
      await transaction.wait();
      return transaction;
    });

    res.json({ txHash: tx.hash, certificate: await loadCertificate(contract, tokenId) });
  })
);

// 발급: 혈액원이 헌혈자 지갑으로 새 증서(ERC-721)를 민팅한다.
//
// 양도는 소유자의 지갑이 직접 온체인 트랜잭션을 보내 권한을 증명하지만, 발급은 아직
// 소유자가 없어서 그 방식을 쓸 수 없다. 따라서 권한의 원천은 "지갑"이 아니라
// "혈액원이라는 기관"이어야 한다.
//
// TODO(C): 혈액원 직원 인증. 지금 이 라우트는 무인증이라 데모 전용이다.
router.post(
  "/issue",
  validateBody(certificateIssueBodySchema),
  asyncHandler(async (req, res) => {
    if (!isConfigured()) return notImplemented(res);

    const requestId = req.get("Idempotency-Key");
    if (!requestId || !/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) {
      return res.status(400).json({ error: "Idempotency-Key 헤더가 필요합니다 (16~100자)." });
    }
    const contract = getCertificateContract({ withSigner: true });
    const scope = await certificateScope(contract);
    const payload = JSON.stringify({ ...req.body, to: req.body.to.toLowerCase() });
    const result = await withChainWrite(async () => {
      let record = findIssuance(scope, requestId);
      if (record && record.payload !== payload) {
        return { status: 409, body: { error: "같은 발급 키에 다른 입력값을 사용할 수 없습니다." } };
      }
      const signer = contract.runner;
      const provider = signer.provider;
      if (!record) {
        // An interrupted broadcast may not be in the node's mempool. Do not
        // overwrite its nonce with a new issue; the original key must recover it.
        for (const pending of pendingIssuances(scope)) {
          const receipt = await provider.getTransactionReceipt(pending.tx_hash);
          if (!receipt) return { status: 409, body: { error: "이전 발급이 미확정입니다. 이전 요청을 재시도하세요." } };
          if (receipt.status === 1) {
            const tokenId = findIssuedTokenId(contract, receipt);
            if (tokenId !== null) confirmIssuance(scope, pending.request_id, tokenId);
          }
        }
        const unsigned = await contract.issue.populateTransaction(req.body.to, BLOOD_CENTER_NAME);
        const transaction = await signer.populateTransaction(unsigned);
        const rawTx = await signer.signTransaction(transaction);
        record = prepareIssuance(scope, requestId, payload, rawTx, ethers.keccak256(rawTx));
      }
      if (record.token_id !== null) {
        return { status: 200, body: { txHash: record.tx_hash, certificate: await loadCertificate(contract, record.token_id) } };
      }
      let receipt = await provider.getTransactionReceipt(record.tx_hash);
      if (!receipt) {
        try { await provider.broadcastTransaction(record.raw_tx); }
        catch (error) {
          if (!await provider.getTransaction(record.tx_hash)) throw error;
        }
        receipt = await provider.waitForTransaction(record.tx_hash, 1, 120000);
      }
      if (!receipt || receipt.status !== 1) {
        return { status: 502, body: { error: "발급 트랜잭션이 실패했거나 아직 미확정입니다.", txHash: record.tx_hash } };
      }
      const tokenId = findIssuedTokenId(contract, receipt);
      if (tokenId === null) return { status: 502, body: { error: "issued tokenId not found" } };
      confirmIssuance(scope, requestId, tokenId);
      return { status: 200, body: { txHash: record.tx_hash, certificate: await loadCertificate(contract, tokenId) } };
    }, { scope, requestId });
    res.status(result.status).json(result.body);
  })
);

export default router;
