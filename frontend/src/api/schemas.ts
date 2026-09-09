import { z } from "zod";

/**
 * backend/src/schemas/*.js 의 응답 계약을 그대로 미러링한 최소 검증 스키마.
 * 백엔드가 응답 형태를 바꾸면 여기서 즉시 실패하도록 유지한다.
 */

export const bloodTypeSchema = z.enum(["A", "B", "AB", "O"]);

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
