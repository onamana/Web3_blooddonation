import { z } from "zod";

/**
 * backend/src/schemas/*.js 의 응답 계약을 그대로 미러링한 최소 검증 스키마.
 * 백엔드가 응답 형태를 바꾸면 여기서 즉시 실패하도록 유지한다.
 */

export const bloodTypeSchema = z.enum(["A", "B", "AB", "O"]);

/**
 * 헌혈 종류. 컨트랙트/실제 백엔드에는 아직 없는 값이라 optional이다 —
 * 없는 기록은 화면에서 정보 미등록으로 표시한다.
 */
export const donationTypeSchema = z.enum(["whole", "plasma", "platelet", "platelet_plasma"]);

export const certificateEventSchema = z.object({
  type: z.enum(["issued", "transferred", "used"]),
  /** unix seconds */
  timestamp: z.number().int(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  org: z.string().nullable(),
  txHash: z.string(),
  blockNumber: z.number().int(),
});

export const certificateSchema = z.object({
  tokenId: z.string(),
  owner: z.string(),
  bloodType: bloodTypeSchema,
  donationType: donationTypeSchema.optional(),
  donationVolume: z.union([z.literal(320), z.literal(400)]).optional(),
  issuedAt: z.number().int(),
  issuer: z.string(),
  status: z.enum(["active", "used"]),
  usedAt: z.number().int().nullable(),
  usedBy: z.string().nullable(),
  history: z.array(certificateEventSchema),
});

export const certificateListResponseSchema = z.object({
  certificates: z.array(certificateSchema),
});

export const certificateVerifyResponseSchema = z.object({
  tokenId: z.string(),
  status: z.enum(["valid", "used", "notfound"]),
  certificate: certificateSchema.nullable(),
});

export const certificateTxResponseSchema = z.object({
  txHash: z.string(),
  certificate: certificateSchema,
});

export const errorResponseSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});
