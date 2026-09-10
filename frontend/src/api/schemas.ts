import { z } from "zod";

/**
 * 백엔드 응답에서 프론트가 사용하는 공개 증서 필드만 검증한다.
 * 혈액 검사정보는 데모 오프체인 저장소에만 두고 이 스키마에 포함하지 않는다.
 */

export const donationTypeSchema = z.enum([
  "WHOLE_BLOOD",
  "PLASMA",
  "PLATELETS",
  "PLATELETS_PLASMA",
]);

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
  donationType: donationTypeSchema.optional(),
  volumeMl: z.number().int().positive().optional(),
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
