import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  donationAuthBodySchema,
  donationAuthResponseSchema,
  donationHashParamSchema,
  donationVerifyResponseSchema,
  donationQueryResponseSchema,
} from "../schemas/donation.js";
import {
  certificateIssueBodySchema,
  certificateListResponseSchema,
  certificateOwnerQuerySchema,
  certificateSchema,
  certificateTokenParamSchema,
  certificateTxResponseSchema,
  certificateUseBodySchema,
  certificateVerifyResponseSchema,
} from "../schemas/certificate.js";
import { matchConditionsSchema } from "../schemas/match.js";
import { errorResponseSchema } from "../schemas/common.js";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "get",
  path: "/health",
  summary: "서버 상태 확인",
  responses: {
    200: {
      description: "정상",
      content: { "application/json": { schema: z.object({ status: z.literal("ok") }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/donation/auth",
  summary: "헌혈 인증 요청 (지갑 서명 검증 후 온체인 record 호출)",
  request: {
    body: { content: { "application/json": { schema: donationAuthBodySchema } } },
  },
  responses: {
    200: {
      description: "기록 성공",
      content: { "application/json": { schema: donationAuthResponseSchema } },
    },
    400: { description: "요청 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "서명 검증 실패", content: { "application/json": { schema: errorResponseSchema } } },
    501: {
      description: "컨트랙트 주소 미설정 (A의 배포 대기 중)",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/donation/verify/{hash}",
  summary: "온체인 기록 존재 여부 확인",
  request: { params: donationHashParamSchema },
  responses: {
    200: { description: "조회 성공", content: { "application/json": { schema: donationVerifyResponseSchema } } },
    400: { description: "hash 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/donation/{hash}",
  summary: "온체인 기록 상세 조회",
  request: { params: donationHashParamSchema },
  responses: {
    200: { description: "조회 성공", content: { "application/json": { schema: donationQueryResponseSchema } } },
    400: { description: "hash 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

const certificateNotImplemented = {
  501: {
    description: "CERTIFICATE_CONTRACT_ADDRESS 미설정 (A의 배포 대기 중)",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

registry.registerPath({
  method: "get",
  path: "/certificate",
  summary: "지갑이 현재 보유한 헌혈 증서 목록 (ERC-721 Transfer 로그 기반)",
  request: { query: certificateOwnerQuerySchema },
  responses: {
    200: { description: "조회 성공", content: { "application/json": { schema: certificateListResponseSchema } } },
    400: { description: "owner 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    ...certificateNotImplemented,
  },
});

registry.registerPath({
  method: "get",
  path: "/certificate/{tokenId}",
  summary: "증서 상세 + 이력 타임라인 (Transfer/CertificateUsed 이벤트 재구성)",
  request: { params: certificateTokenParamSchema },
  responses: {
    200: { description: "조회 성공", content: { "application/json": { schema: certificateSchema } } },
    400: { description: "tokenId 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    ...certificateNotImplemented,
  },
});

registry.registerPath({
  method: "get",
  path: "/certificate/{tokenId}/verify",
  summary: "병원 검증 (valid / used(이중사용) / notfound 판정)",
  request: { params: certificateTokenParamSchema },
  responses: {
    200: { description: "판정 결과", content: { "application/json": { schema: certificateVerifyResponseSchema } } },
    400: { description: "tokenId 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    ...certificateNotImplemented,
  },
});

registry.registerPath({
  method: "post",
  path: "/certificate/issue",
  summary: "증서 발급 (혈액원 → 헌혈자 지갑으로 민팅). issuer/issuedAt은 서버·컨트랙트가 정한다",
  request: {
    body: { content: { "application/json": { schema: certificateIssueBodySchema } } },
  },
  responses: {
    200: { description: "발급 성공", content: { "application/json": { schema: certificateTxResponseSchema } } },
    400: { description: "to/bloodType 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    502: {
      description: "발급 트랜잭션에서 tokenId를 찾지 못함",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    ...certificateNotImplemented,
  },
});

registry.registerPath({
  method: "post",
  path: "/certificate/{tokenId}/use",
  summary: "증서 사용 처리 (이미 사용된 증서면 409로 이중사용 차단)",
  request: {
    params: certificateTokenParamSchema,
    body: { content: { "application/json": { schema: certificateUseBodySchema } } },
  },
  responses: {
    200: { description: "사용 처리 성공", content: { "application/json": { schema: certificateTxResponseSchema } } },
    409: { description: "이미 사용됨 (이중사용 차단)", content: { "application/json": { schema: errorResponseSchema } } },
    ...certificateNotImplemented,
  },
});

registry.registerPath({
  method: "post",
  path: "/match",
  summary: "병원 매칭 조건을 B(DID 모듈)로 중계",
  request: {
    body: { content: { "application/json": { schema: matchConditionsSchema } } },
  },
  responses: {
    200: { description: "매칭 결과 (B 모듈 응답을 그대로 전달)" },
    400: { description: "요청 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    501: {
      description: "DID_MODULE_BASE_URL 미설정 (B의 구현 대기 중)",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    502: { description: "DID 모듈 연결 실패", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "헌혈 이력 / 병원 매칭 API",
      version: "0.1.0",
      description: "blockhack.kr 해커톤 백엔드 API",
    },
    servers: [{ url: "/" }],
  });
}
