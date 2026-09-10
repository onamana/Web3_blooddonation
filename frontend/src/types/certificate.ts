import type { z } from "zod";
import type {
  certificateEventSchema,
  certificateSchema,
  certificateTxResponseSchema,
  certificateVerifyResponseSchema,
} from "../api/schemas";

/**
 * 증서 도메인 타입은 백엔드 응답 스키마(api/schemas.ts)에서 그대로 파생시킨다.
 * 데모 목업도 같은 타입을 쓰므로 데모/실제 API 모드의 화면 코드가 완전히 같다.
 */
export type Certificate = z.infer<typeof certificateSchema>;
export type DonationType = NonNullable<Certificate["donationType"]>;
export type CertificateEvent = z.infer<typeof certificateEventSchema>;
export type CertificateEventType = CertificateEvent["type"];
export type CertificateVerifyResult = z.infer<typeof certificateVerifyResponseSchema>;
export type CertificateTxResult = z.infer<typeof certificateTxResponseSchema>;
