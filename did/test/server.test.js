process.env.DID_ISSUER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env.DID_ISSUE_API_KEY = "test-secret-key";
process.env.NODE_ENV = "test";

const request = require('supertest');
const app = require('../src/server');

describe('DID Server API 계층 통합 검증 테스트', () => {
  const validHolder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const validApiKey = "test-secret-key";

  // -------------------------------------------------------------
  // 피드백 1-3: 발급 API 인증/인가 검증
  // -------------------------------------------------------------
  describe('POST /vc/issue 인증 테스트 (피드백 1-3)', () => {
    test('x-api-key 헤더가 없으면 401 Unauthorized 반환해야 한다', async () => {
      const res = await request(app)
        .post('/vc/issue')
        .send({ holderAddress: validHolder, bloodType: 'O' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('x-api-key 헤더가 누락');
    });

    test('잘못된 x-api-key를 제공하면 403 Forbidden 반환해야 한다', async () => {
      const res = await request(app)
        .post('/vc/issue')
        .set('x-api-key', 'wrong-invalid-key')
        .send({ holderAddress: validHolder, bloodType: 'O' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('유효하지 않은 API Key');
    });
  });

  // -------------------------------------------------------------
  // 피드백 1-4: 발급 입력값 엄격 검증
  // -------------------------------------------------------------
  describe('POST /vc/issue 입력값 유효성 테스트 (피드백 1-4)', () => {
    test('유효하지 않은 이더리움 주소는 400 Bad Request 반환해야 한다', async () => {
      const res = await request(app)
        .post('/vc/issue')
        .set('x-api-key', validApiKey)
        .send({ holderAddress: "not-an-address", bloodType: 'O' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('유효한 이더리움 지갑 주소');
    });

    test('지원하지 않는 혈액형(예: INVALID)은 400 Bad Request 반환해야 한다', async () => {
      const res = await request(app)
        .post('/vc/issue')
        .set('x-api-key', validApiKey)
        .send({ holderAddress: validHolder, bloodType: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('지원하지 않는 혈액형');
    });

    test('isEligible이 boolean이 아니면 400 Bad Request 반환해야 한다', async () => {
      const res = await request(app)
        .post('/vc/issue')
        .set('x-api-key', validApiKey)
        .send({ holderAddress: validHolder, bloodType: 'O', isEligible: "string-true" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('boolean');
    });

    test('정상적인 요청은 201 Created와 서명된 VC를 반환해야 한다', async () => {
      const res = await request(app)
        .post('/vc/issue')
        .set('x-api-key', validApiKey)
        .send({
          holderAddress: validHolder,
          bloodType: 'B',
          isEligible: true,
          lastDonationDate: '2026-08-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.vc.proof.jws).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 피드백 1-4, 3-2: 매칭 API 입력값 및 query 일치 검증
  // -------------------------------------------------------------
  describe('POST /match 입력값 및 응답 query 검증 (피드백 1-4, 3-2)', () => {
    test('음수나 유효하지 않은 minDaysSinceLastDonation은 400 반환해야 한다', async () => {
      const res = await request(app)
        .post('/match')
        .send({ minDaysSinceLastDonation: -10 });

      expect(res.status).toBe(400);
    });

    test('onlyEligible: false 요청 시 응답 query에도 false가 정확히 반영되어야 한다 (3-2)', async () => {
      const res = await request(app)
        .post('/match')
        .send({ bloodType: 'O', onlyEligible: false });

      expect(res.status).toBe(200);
      expect(res.body.query.onlyEligible).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 피드백 2-1: 전체 VC 조회 엔드포인트 격리 검증
  // -------------------------------------------------------------
  describe('GET /vc 보안 격리 테스트 (피드백 2-1)', () => {
    test('운영/테스트 환경에서는 GET /vc 접근 시 404를 반환해야 한다', async () => {
      const res = await request(app).get('/vc');
      expect(res.status).toBe(404);
    });
  });
});