import { demoCertificateStore } from "../data/certificateStore";
import type { Certificate, CertificateTxResult, CertificateVerifyResult } from "../types/certificate";
import { ApiError, apiRequest } from "./client";
import { CERTIFICATE_CONTRACT_ADDRESS, DEMO_BLOOD_CENTER_NAME, DEMO_MODE } from "./env";
import {
  certificateListResponseSchema,
  certificateSchema,
  certificateTxResponseSchema,
  certificateVerifyResponseSchema,
} from "./schemas";

/**
 * 헌혈 증서(ERC-721) API.
 *
 * DEMO_MODE에서는 인메모리 목업 스토어를, 아니면 백엔드 /certificate 를 호출한다.
 * 두 경로가 같은 타입을 돌려주므로 화면 코드는 분기를 몰라도 된다.
 */

export async function listCertificates(owner: string): Promise<Certificate[]> {
  if (DEMO_MODE) return demoCertificateStore.list(owner);

  const raw = await apiRequest<unknown>(`/certificate?owner=${encodeURIComponent(owner)}`);
  return certificateListResponseSchema.parse(raw).certificates;
}

export async function getCertificate(tokenId: string): Promise<Certificate> {
  if (DEMO_MODE) {
    const found = demoCertificateStore.get(tokenId);
    if (!found) throw new ApiError(404, "존재하지 않는 증서입니다.");
    return found;
  }

  const raw = await apiRequest<unknown>(`/certificate/${encodeURIComponent(tokenId)}`);
  return certificateSchema.parse(raw);
}

export async function verifyCertificate(tokenId: string): Promise<CertificateVerifyResult> {
  if (DEMO_MODE) {
    const found = demoCertificateStore.get(tokenId);
    if (!found) return { tokenId, status: "notfound", certificate: null };
    return { tokenId, status: found.status === "used" ? "used" : "valid", certificate: found };
  }

  const raw = await apiRequest<unknown>(`/certificate/${encodeURIComponent(tokenId)}/verify`);
  return certificateVerifyResponseSchema.parse(raw);
}

export interface IssueCertificateRequest {
  /** 증서를 받을 헌혈자 지갑 주소 */
  to: string;
  /** 혈액원 검사 결과 */
  bloodType: Certificate["bloodType"];
}

/**
 * 발급. 발급기관 명(issuer)은 보내지 않는다 — 서버가 정한다.
 * 클라이언트가 발급기관을 적을 수 있으면 검증 화면의 "OO혈액원 발급"이 의미를 잃는다.
 */
export async function issueCertificate({ to, bloodType }: IssueCertificateRequest): Promise<CertificateTxResult> {
  if (DEMO_MODE) return demoCertificateStore.issue(to, bloodType, DEMO_BLOOD_CENTER_NAME);

  const raw = await apiRequest<unknown>("/certificate/issue", {
    method: "POST",
    body: { to, bloodType },
  });
  return certificateTxResponseSchema.parse(raw);
}

export interface TransferCertificateRequest {
  tokenId: string;
  from: string;
  to: string;
}

/**
 * 양도. relayer 방식은 쓰지 않는다 — ERC-721에서 relayer가 transferFrom을 보내려면
 * 소유자가 미리 approve()를 해야 하는데 그 단계가 없으면 항상 ERC721InsufficientApproval로
 * revert된다. 대신 소유자의 MetaMask가 컨트랙트의 safeTransferFrom()을 직접 호출하고,
 * tx가 블록에 반영된 뒤 백엔드에서 최신 소유자/이력을 다시 읽어온다(백엔드는 조회만 담당).
 * 사용된 증서의 양도 차단은 컨트랙트가 온체인에서 강제한다.
 */
export async function transferCertificate({
  tokenId,
  from,
  to,
}: TransferCertificateRequest): Promise<CertificateTxResult> {
  if (DEMO_MODE) return demoCertificateStore.transfer(tokenId, from, to);

  if (!CERTIFICATE_CONTRACT_ADDRESS) {
    throw new ApiError(0, "증서 컨트랙트 주소가 설정되지 않았습니다.");
  }

  const txHash = await sendSafeTransferFrom({ from, to, tokenId });
  await waitForTransactionReceipt(txHash);

  const certificate = await getCertificate(tokenId);
  return { txHash, certificate };
}

const SAFE_TRANSFER_FROM_SELECTOR = "42842e0e"; // keccak256("safeTransferFrom(address,address,uint256)")[:4]

/** `safeTransferFrom(address,address,uint256)` 호출 데이터를 라이브러리 없이 직접 인코딩한다. */
function encodeSafeTransferFromCalldata(from: string, to: string, tokenId: string): string {
  const padAddress = (address: string) => address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const padTokenId = BigInt(tokenId).toString(16).padStart(64, "0");
  return `0x${SAFE_TRANSFER_FROM_SELECTOR}${padAddress(from)}${padAddress(to)}${padTokenId}`;
}

async function sendSafeTransferFrom({
  from,
  to,
  tokenId,
}: TransferCertificateRequest): Promise<string> {
  const eth = window.ethereum;
  if (!eth) throw new ApiError(0, "MetaMask가 필요합니다.");

  try {
    return await eth.request<string>({
      method: "eth_sendTransaction",
      params: [{ from, to: CERTIFICATE_CONTRACT_ADDRESS, data: encodeSafeTransferFromCalldata(from, to, tokenId) }],
    });
  } catch (err) {
    const message =
      err instanceof Error && "code" in err && (err as { code?: number }).code === 4001
        ? "양도 트랜잭션 요청을 취소했습니다."
        : "양도 트랜잭션 전송에 실패했습니다.";
    throw new ApiError(0, message, err instanceof Error ? err.message : String(err));
  }
}

interface TransactionReceipt {
  status: string;
  transactionHash: string;
}

/** eth_getTransactionReceipt를 폴링해 트랜잭션이 채굴/성공했는지 확인한다 (revert 시 에러). */
async function waitForTransactionReceipt(
  txHash: string,
  { intervalMs = 1500, maxAttempts = 40 }: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<TransactionReceipt> {
  const eth = window.ethereum;
  if (!eth) throw new ApiError(0, "MetaMask가 필요합니다.");

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const receipt = await eth.request<TransactionReceipt | null>({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) {
      if (receipt.status !== "0x1") {
        throw new ApiError(0, "양도 트랜잭션이 실패했습니다 (이미 사용된 증서이거나 소유자가 아닐 수 있습니다).");
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new ApiError(0, "양도 트랜잭션 확인이 시간 초과되었습니다.");
}

/** 사용 처리. 이름이 use…로 시작하면 React 훅으로 오인되므로 mark… 로 둔다. */
export async function markCertificateUsed(tokenId: string, hospital: string): Promise<CertificateTxResult> {
  if (DEMO_MODE) return demoCertificateStore.use(tokenId, hospital);

  const raw = await apiRequest<unknown>(`/certificate/${encodeURIComponent(tokenId)}/use`, {
    method: "POST",
    body: { hospital },
  });
  return certificateTxResponseSchema.parse(raw);
}
