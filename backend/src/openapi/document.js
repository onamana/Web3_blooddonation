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
import { credentialIssueSchema, credentialVerifySchema, credentialRevokeSchema } from '../schemas/credential.js';

const registry = new OpenAPIRegistry();
registry.registerComponent('securitySchemes', 'demoSession', { type: 'apiKey', in: 'cookie', name: 'bloodpass_demo' });
for (const [action, schema, summary] of [
  ['issue', credentialIssueSchema, '가상 검사정보로 자격 VC 발급·갱신 (기존 VC 무효화)'],
  ['verify', credentialVerifySchema, '자격 VC 서명·만료·취소 검증'],
  ['revoke', credentialRevokeSchema, '자격 VC 취소'],
]) {
  registry.registerPath({ method: 'post', path: `/credentials/${action}`, summary,
    request: { body: { content: { 'application/json': { schema } } } },
    responses: { [action === 'issue' ? 201 : 200]: { description: '처리 결과' },
      400: { description: '입력 오류' }, 401: { description: '데모 로그인 필요' },
      404: { description: '취소 대상 없음' }, 502: { description: 'DID 연결 실패' }, 503: { description: 'DID 미설정' } },
  });
}
registry.registerPath({ method: 'get', path: '/session', security: [], responses: { 200: { description: 'required, authenticated' } } });
registry.registerPath({ method: 'post', path: '/session/login', security: [],
  request: { body: { content: { 'application/json': { schema: z.object({ password: z.string() }) } } } },
  responses: { 200: { description: 'HttpOnly 세션 쿠키 발급' }, 401: { description: '암호 불일치' }, 429: { description: '시도 제한' } },
});
registry.registerPath({ method: 'post', path: '/session/logout', responses: { 200: { description: '브라우저 세션 쿠키 삭제' } } });

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
    headers: z.object({ "Idempotency-Key": z.string().min(16).max(100) }),
    body: { content: { "application/json": { schema: certificateIssueBodySchema } } },
  },
  responses: {
    200: { description: "발급 성공", content: { "application/json": { schema: certificateTxResponseSchema } } },
    400: { description: "지갑/헌혈 종류/헌혈량/발급 키 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "발급 키 입력 불일치 또는 이전 발급 미확정" },
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
  summary: "최신 자격 VC 기반 후보자 조건 검색 (병원 배정 아님)",
  request: {
    body: { content: { "application/json": { schema: matchConditionsSchema } } },
  },
  responses: {
    200: { description: "matchedCount, matches: holderDid/bloodType/isEligible/lastDonationDate/issuerDid/verifiedSignature" },
    400: { description: "요청 형식 오류", content: { "application/json": { schema: errorResponseSchema } } },
    503: {
      description: "DID_MODULE_BASE_URL 또는 DID_ISSUE_API_KEY 미설정",
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
      description: '초대형 테스트넷 데모. production API는 세션 쿠키가 필요합니다. POST는 X-Demo-Request: 1 헤더 필수. 실제 개인정보 입력 금지.',
    },
    servers: [{ url: process.env.PUBLIC_API_PREFIX || '/' }],
    security: [{ demoSession: [] }],
  });
}
