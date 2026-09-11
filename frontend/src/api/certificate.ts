import { demoCertificateStore } from "../data/certificateStore";
import { demoBloodProfileStore } from "../data/demoBloodProfileStore";
import type {
  Certificate,
  CertificateTxResult,
  CertificateVerifyResult,
  DonationType,
} from "../types/certificate";
import { ApiError, apiRequest } from "./client";
import { CERTIFICATE_CONTRACT_ADDRESS, CHAIN_ID, DEMO_BLOOD_CENTER_NAME, DEMO_MODE } from "./env";
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
  /** 혈액원 담당자가 선택한 헌혈 종류 */
  donationType: DonationType;
  /** 전혈일 때 선택한 헌혈량(mL) */
  volumeMl?: 320 | 400;
  requestId: string;
}

/**
 * 발급. 발급기관 명(issuer)은 보내지 않는다 — 서버가 정한다.
 * 클라이언트가 발급기관을 적을 수 있으면 검증 화면의 "OO혈액원 발급"이 의미를 잃는다.
 */
export async function issueCertificate({
  to,
  donationType,
  volumeMl,
  requestId,
}: IssueCertificateRequest): Promise<CertificateTxResult> {
  if (DEMO_MODE) {
    const profile = demoBloodProfileStore.getByWallet(to);
    if (!profile) {
      throw new ApiError(
        404,
        "이 지갑 주소에 등록된 데모 혈액 검사정보가 없습니다.",
        "데모 지갑 주소 채우기 버튼을 사용하세요.",
      );
    }

    const result = demoCertificateStore.issue(
      to,
      DEMO_BLOOD_CENTER_NAME,
      donationType,
      volumeMl,
    );
    demoBloodProfileStore.linkCertificate(result.certificate.tokenId, profile);
    return result;
  }

  const raw = await apiRequest<unknown>("/certificate/issue", {
    method: "POST",
    body: { to, donationType, volumeMl },
    headers: { "Idempotency-Key": requestId },
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

  return requestRelayedTransfer({ from, to, tokenId });
}

/**
 * MetaMask에는 가스를 쓰지 않는 EIP-712 서명만 요청하고, 서명을 백엔드 릴레이어에 전달한다.
 * 컨트랙트가 정확한 수신자·토큰·만료·일회성 nonce를 검증하므로 서명을 다른 양도에 쓸 수 없다.
 */
async function requestRelayedTransfer({
  from,
  to,
  tokenId,
}: TransferCertificateRequest): Promise<CertificateTxResult> {
  const eth = window.ethereum;
  if (!eth) throw new ApiError(0, "MetaMask가 필요합니다.");

  try {
    const chainId = await eth.request<string>({ method: "eth_chainId" });
    if (chainId.toLowerCase() !== CHAIN_ID.toLowerCase()) {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] });
      if ((await eth.request<string>({ method: "eth_chainId" })).toLowerCase() !== CHAIN_ID.toLowerCase()) {
        throw new Error("지갑 네트워크를 확인해 주세요.");
      }
    }

    const deadline = Math.floor(Date.now() / 1000) + 10 * 60;
    const nonce = createNonce();
    const signature = await eth.request<string>({
      method: "eth_signTypedData_v4",
      params: [from, JSON.stringify({
        domain: {
          name: "BloodPass Certificate",
          version: "1",
          chainId: Number(CHAIN_ID),
          verifyingContract: CERTIFICATE_CONTRACT_ADDRESS,
        },
        primaryType: "TransferAuthorization",
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          TransferAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "deadline", type: "uint256" },
          ],
        },
        message: { from, to, tokenId, nonce, deadline: String(deadline) },
      })],
    });

    const raw = await apiRequest<unknown>(`/certificate/${encodeURIComponent(tokenId)}/transfer`, {
      method: "POST",
      body: { from, to, nonce, deadline, signature },
    });
    return certificateTxResponseSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message =
      err instanceof Error && "code" in err && (err as { code?: number }).code === 4001
        ? "양도 서명을 취소했습니다."
        : "양도 서명 요청에 실패했습니다.";
    throw new ApiError(0, message, err instanceof Error ? err.message : String(err));
  }
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * MetaMask 확인 화면이 비활성화되는 가장 흔한 원인(보내는 지갑의 가스비 부족)을
 * 지갑 팝업 전에 알려 준다. 수신 지갑의 잔액은 확인하지 않는다.
 */
export async function assertSenderCanPayGas({ from, data }: { from: string; data: string }): Promise<void> {
  const eth = window.ethereum;
  if (!eth) return;

  try {
    const transaction = { from, to: CERTIFICATE_CONTRACT_ADDRESS, data };
    const [balanceHex, gasHex, gasPriceHex] = await Promise.all([
      eth.request<string>({ method: "eth_getBalance", params: [from, "latest"] }),
      eth.request<string>({ method: "eth_estimateGas", params: [transaction] }),
      eth.request<string>({ method: "eth_gasPrice" }),
    ]);
    const balance = BigInt(balanceHex);
    // 수수료 변동을 고려해 추정치보다 20% 여유를 둔다.
    const required = (BigInt(gasHex) * BigInt(gasPriceHex) * 120n + 99n) / 100n;

    if (balance < required) {
      throw new ApiError(
        0,
        `Sepolia ETH가 부족합니다. 증서를 보내는 지갑(${shortenAddress(from)})에 약 ${formatEth(required)} SepoliaETH 이상이 필요합니다. 받는 지갑에는 ETH가 없어도 됩니다.`
      );
    }
  } catch (error) {
    // 잔액 부족은 반드시 표시한다. 노드의 추정 API가 일시적으로 실패한 경우에는
    // MetaMask가 자체적으로 수수료를 계산하도록 양도 요청을 계속 진행한다.
    if (error instanceof ApiError) throw error;
  }
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatEth(wei: bigint): string {
  const decimals = 1_000_000_000_000_000_000n;
  const whole = wei / decimals;
  const fraction = (wei % decimals).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export interface TransactionReceipt {
  status: string;
  transactionHash: string;
}

/** eth_getTransactionReceipt를 폴링해 트랜잭션이 채굴/성공했는지 확인한다 (revert 시 에러). */
export async function waitForTransactionReceipt(
  txHash: string,
  { intervalMs = 1500, maxAttempts = 40 }: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<TransactionReceipt> {
  const eth = window.ethereum;
  if (!eth) throw new ApiError(0, "MetaMask가 필요합니다.");

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if ((await eth.request<string>({ method: "eth_chainId" })).toLowerCase() !== CHAIN_ID.toLowerCase()) {
      throw new ApiError(0, "확인 중 지갑 네트워크가 변경되었습니다.");
    }
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
