import { demoCertificateStore } from "../data/certificateStore";
import type { Certificate, CertificateTxResult, CertificateVerifyResult } from "../types/certificate";
import { ApiError, apiRequest } from "./client";
import { DEMO_BLOOD_CENTER_NAME, DEMO_MODE } from "./env";
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
 * 양도. 실제 API 모드에서는 소유자가 지갑으로 서명한 메시지를 함께 보내고
 * 백엔드가 서명을 검증한 뒤 transferFrom을 릴레이한다.
 */
export async function transferCertificate({
  tokenId,
  from,
  to,
}: TransferCertificateRequest): Promise<CertificateTxResult> {
  if (DEMO_MODE) return demoCertificateStore.transfer(tokenId, from, to);

  const message = `blood-certificate-transfer:${tokenId}:${Math.floor(Date.now() / 1000)}`;
  const signature = await signMessage(message, from);
  const raw = await apiRequest<unknown>(`/certificate/${encodeURIComponent(tokenId)}/transfer`, {
    method: "POST",
    body: { from, to, message, signature },
  });
  return certificateTxResponseSchema.parse(raw);
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

async function signMessage(message: string, address: string): Promise<string> {
  const eth = window.ethereum;
  if (!eth) throw new ApiError(0, "MetaMask가 필요합니다.");
  return eth.request<string>({ method: "personal_sign", params: [message, address] });
}
