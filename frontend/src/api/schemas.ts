import { z } from "zod";

/**
 * backend/src/schemas/*.js 의 응답 계약을 그대로 미러링한 최소 검증 스키마.
 * 백엔드가 응답 형태를 바꾸면 여기서 즉시 실패하도록 유지한다.
 */

export const bloodTypeSchema = z.enum(["A", "B", "AB", "O"]);

export const donationAuthResponseSchema = z.object({
  donationHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  timestamp: z.number().int(),
  bloodType: bloodTypeSchema,
  txHash: z.string().optional(),
});
export type DonationAuthResponse = z.infer<typeof donationAuthResponseSchema>;

export const donationAuthNotImplementedSchema = z.object({
  error: z.string(),
  wouldRecord: z.object({
    donationHash: z.string(),
    timestamp: z.number().int(),
    bloodType: bloodTypeSchema,
  }),
});
export type DonationAuthNotImplemented = z.infer<typeof donationAuthNotImplementedSchema>;

export const donationVerifyResponseSchema = z.object({
  donationHash: z.string(),
  verified: z.boolean(),
});
export type DonationVerifyResponse = z.infer<typeof donationVerifyResponseSchema>;

export const donationQueryResponseSchema = z.object({
  donationHash: z.string(),
  timestamp: z.number().int(),
  bloodType: z.union([z.number(), z.string()]),
});
export type DonationQueryResponse = z.infer<typeof donationQueryResponseSchema>;

export const errorResponseSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});

/**
 * TODO: B(DID 모듈)의 /match 응답 스펙이 아직 확정되지 않았다.
 * 지금은 "알 수 없는 형태의 JSON"이라는 것만 보장하고,
 * 실제 필드 매핑은 스펙이 나오는 대로 features/hospital/matchAdapter.ts 에서 구현한다.
 */
export const unknownMatchResponseSchema = z.unknown();
