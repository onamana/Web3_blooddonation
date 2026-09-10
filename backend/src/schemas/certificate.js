import { z } from "zod";
import { ethAddressSchema, bloodTypeSchema } from "./common.js";

export const tokenIdSchema = z
  .string()
  .regex(/^\d+$/, "tokenId는 10진수 정수 문자열이어야 합니다")
  .meta({ example: "94", description: "ERC-721 tokenId" });

export const certificateTokenParamSchema = z
  .object({ tokenId: tokenIdSchema })
  .meta({ id: "CertificateTokenParam" });

export const certificateOwnerQuerySchema = z
  .object({ owner: ethAddressSchema })
  .meta({ id: "CertificateOwnerQuery" });

/** ERC-721 Transfer / CertificateUsed 이벤트 로그 한 건을 화면용 이력으로 변환한 모양 */
export const certificateEventSchema = z
  .object({
    type: z.enum(["issued", "transferred", "used"]),
    timestamp: z.number().int(),
    from: z.string().nullable(),
    to: z.string().nullable(),
    org: z.string().nullable(),
    txHash: z.string(),
    blockNumber: z.number().int(),
  })
  .meta({ id: "CertificateEvent" });

export const certificateSchema = z
  .object({
    tokenId: tokenIdSchema,
    owner: ethAddressSchema,
    bloodType: bloodTypeSchema,
    issuedAt: z.number().int(),
    issuer: z.string(),
    status: z.enum(["active", "used"]),
    usedAt: z.number().int().nullable(),
    usedBy: z.string().nullable(),
    history: z.array(certificateEventSchema),
  })
  .meta({ id: "Certificate" });

export const certificateListResponseSchema = z
  .object({ certificates: z.array(certificateSchema) })
  .meta({ id: "CertificateListResponse" });

/**
 * 발급 요청.
 *
 * `issuer`(혈액원 명)는 일부러 받지 않는다 — 클라이언트가 발급기관을 자기 마음대로
 * 적을 수 있으면 검증 화면의 "대전혈액원 발급"이 아무 의미가 없어진다. 서버 설정
 * (BLOOD_CENTER_NAME)에서만 결정한다. `issuedAt`도 컨트랙트의 block.timestamp를 쓴다.
 */
export const certificateIssueBodySchema = z
  .object({
    to: ethAddressSchema.meta({ description: "증서를 받을 헌혈자 지갑 주소" }),
    bloodType: bloodTypeSchema.meta({ description: "혈액원 검사 결과 (헌혈자 자기 신고가 아니다)" }),
  })
  .meta({ id: "CertificateIssueRequest" });

export const certificateUseBodySchema = z
  .object({
    hospital: z.string().min(1).meta({ example: "충남대병원" }),
  })
  .meta({ id: "CertificateUseRequest" });

/**
 * 검증 결과. `used`가 이중사용 차단 케이스이며, 프론트의 "검증 실패" 화면이 이 값을 보고 그려진다.
 */
export const certificateVerifyResponseSchema = z
  .object({
    tokenId: tokenIdSchema,
    status: z.enum(["valid", "used", "notfound"]),
    certificate: certificateSchema.nullable(),
  })
  .meta({ id: "CertificateVerifyResponse" });

export const certificateTxResponseSchema = z
  .object({
    txHash: z.string(),
    certificate: certificateSchema,
  })
  .meta({ id: "CertificateTxResponse" });
