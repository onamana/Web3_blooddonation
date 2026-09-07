import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  donationAuthBodySchema,
  donationAuthResponseSchema,
  donationHashParamSchema,
  donationVerifyResponseSchema,
  donationQueryResponseSchema,
} from "../schemas/donation.js";
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
