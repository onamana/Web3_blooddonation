import type { BloodType } from "../types/common";
import { apiRequest } from "./client";
import {
  donationAuthResponseSchema,
  donationQueryResponseSchema,
  donationVerifyResponseSchema,
  type DonationAuthResponse,
  type DonationQueryResponse,
  type DonationVerifyResponse,
} from "./schemas";

export interface DonationAuthRequest {
  address: string;
  message: string;
  signature: string;
  bloodType: BloodType;
}

/**
 * POST /donation/auth
 *
 * 주의(발견 사항, README 참고): 백엔드는 bloodType을 "A"|"B"|"AB"|"O" 문자열로 받지만,
 * 샘플 스마트컨트랙트 ABI(DonationRegistry.sample.abi.json)의 record 함수는 bloodType을
 * uint8로 받는다. 이 문자열 → uint8 매핑 규칙이 A/B/C 담당자 간에 아직 합의되지 않았으므로
 * 프론트에서 임의로 추측 변환하지 않고, 백엔드가 요구하는 문자열 그대로 전달한다.
 */
export async function postDonationAuth(payload: DonationAuthRequest): Promise<DonationAuthResponse> {
  const raw = await apiRequest<unknown>("/donation/auth", { method: "POST", body: payload });
  return donationAuthResponseSchema.parse(raw);
}

export async function getDonationVerify(hash: string): Promise<DonationVerifyResponse> {
  const raw = await apiRequest<unknown>(`/donation/verify/${encodeURIComponent(hash)}`);
  return donationVerifyResponseSchema.parse(raw);
}

export async function getDonation(hash: string): Promise<DonationQueryResponse> {
  const raw = await apiRequest<unknown>(`/donation/${encodeURIComponent(hash)}`);
  return donationQueryResponseSchema.parse(raw);
}
