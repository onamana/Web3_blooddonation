require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { timingSafeEqual } = require('node:crypto');
const {
  ISSUER_DID,
  matchCandidates,
  issueBloodVC,
  verifyBloodVC,
  getStoredVCs,
  saveVC,
  revokeVC,
  initMockStore
} = require('./services/vcService');

const app = express();
const PORT = process.env.PORT || 5001;
const ALLOWED_BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
if (!process.env.DID_ISSUE_API_KEY) throw new Error('DID_ISSUE_API_KEY is required');
if (process.env.NODE_ENV === 'production' && process.env.DID_ISSUE_API_KEY.length < 32) throw new Error('Use an internal API key of at least 32 characters');
if (process.env.NODE_ENV === 'production' && process.env.DID_SEED_DEMO === 'true') throw new Error('Demo seeding is disabled in production');

// CORS 화이트리스트 구성
const allowedOrigins = (process.env.DID_ALLOWED_ORIGINS || 'http://localhost:4000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS 정책에 의해 차단된 Origin입니다.'));
  }
}));

app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// API 인증 미들웨어 (발급 전용)
function requireIssuerAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.DID_ISSUE_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({ error: "서버 보안 설정 오류: DID_ISSUE_API_KEY 미설정" });
  }
  if (!apiKey) {
    return res.status(401).json({ error: "인증 실패: x-api-key 헤더가 누락되었습니다." });
  }
  if (Buffer.byteLength(apiKey) !== Buffer.byteLength(expectedKey) || !timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))) {
    return res.status(403).json({ error: "인가 실패: 유효하지 않은 API Key입니다." });
  }
  next();
}

// 헬스체크
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'DID/VC Service',
    issuerDid: ISSUER_DID,
    port: PORT
  });
});

// 운영/테스트 환경 전체 VC 유출 차단 (개발 모드 한정 허용)
app.get('/vc', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "운영 환경에서는 전체 VC 목록 조회를 지원하지 않습니다." });
  }
  requireIssuerAuth(req, res, () => res.json(getStoredVCs()));
});

app.use(requireIssuerAuth);

app.post('/vc/revoke', (req, res) => {
  const { id } = req.body || {};
  if (typeof id !== 'string' || id.length > 100) return res.status(400).json({ error: 'VC id가 필요합니다.' });
  if (!revokeVC(id)) return res.status(404).json({ error: 'VC를 찾을 수 없습니다.' });
  res.json({ success: true });
});

// 단건 VC 검증 API
app.post('/vc/verify', (req, res) => {
  const { vc } = req.body;
  if (!vc) {
    return res.status(400).json({ error: "검증할 vc 객체가 필요합니다." });
  }
  const result = verifyBloodVC(vc);
  res.json(result);
});

// VC 발급 API
app.post('/vc/issue', requireIssuerAuth, async (req, res) => {
  try {
    const { holderAddress, bloodType, isEligible, lastDonationDate, daysValid } = req.body;

    if (!holderAddress || !ethers.isAddress(holderAddress)) {
      return res.status(400).json({ error: "유효한 이더리움 지갑 주소(holderAddress)가 필요합니다." });
    }

    if (typeof bloodType !== 'string' || !ALLOWED_BLOOD_TYPES.includes(bloodType.toUpperCase())) {
      return res.status(400).json({ error: `지원하지 않는 혈액형입니다. (${ALLOWED_BLOOD_TYPES.join(', ')})` });
    }

    if (typeof isEligible !== 'boolean') {
      return res.status(400).json({ error: "isEligible 필드는 boolean 타입이어야 합니다." });
    }

    if (typeof lastDonationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(lastDonationDate) || !Number.isFinite(Date.parse(lastDonationDate)) || new Date(lastDonationDate).toISOString().slice(0, 10) !== lastDonationDate || Date.parse(lastDonationDate) > Date.now()) {
      return res.status(400).json({ error: "유효한 날짜 형식이 아닙니다. (예: YYYY-MM-DD)" });
    }

    if (daysValid !== undefined && (!Number.isInteger(daysValid) || daysValid < 1 || daysValid > 365)) {
      return res.status(400).json({ error: 'daysValid는 1~365 사이의 정수여야 합니다.' });
    }
    if (Object.keys(req.body).some(key => !['holderAddress', 'bloodType', 'isEligible', 'lastDonationDate', 'daysValid'].includes(key))) return res.status(400).json({ error: '지원하지 않는 입력 필드입니다.' });

    const vc = await issueBloodVC({
      holderAddress: ethers.getAddress(holderAddress),
      bloodType: bloodType.toUpperCase(),
      isEligible: isEligible ?? true,
      lastDonationDate,
      daysValid: daysValid ?? 90
    });

    saveVC(vc);
    res.status(201).json({ success: true, vc });
  } catch (err) {
    res.status(500).json({ error: "VC 발급 처리 실패" });
  }
});

// 적격자 매칭 API
app.post('/match', async (req, res) => {
  try {
    const { bloodType, minDaysSinceLastDonation, onlyEligible } = req.body;

    if (Object.keys(req.body).some(key => !['bloodType', 'minDaysSinceLastDonation', 'onlyEligible'].includes(key))) return res.status(400).json({ error: '지원하지 않는 매칭 필드입니다.' });
    if (bloodType !== undefined && (typeof bloodType !== 'string' || !ALLOWED_BLOOD_TYPES.includes(bloodType.toUpperCase()))) {
      return res.status(400).json({ error: "허용되지 않은 혈액형 쿼리입니다." });
    }

    if (minDaysSinceLastDonation !== undefined) {
      const days = minDaysSinceLastDonation;
      if (!Number.isInteger(days) || days < 0) {
        return res.status(400).json({ error: "minDaysSinceLastDonation 값은 0 이상의 정수여야 합니다." });
      }
    }

    if (onlyEligible !== undefined && typeof onlyEligible !== 'boolean') {
      return res.status(400).json({ error: "onlyEligible 값은 boolean이어야 합니다." });
    }

    const effectiveOnlyEligible = onlyEligible !== undefined ? onlyEligible : true;

    const matchedResults = await matchCandidates({
      bloodType: bloodType ? bloodType.toUpperCase() : undefined,
      minDaysSinceLastDonation: minDaysSinceLastDonation !== undefined ? Number(minDaysSinceLastDonation) : undefined,
      onlyEligible: effectiveOnlyEligible
    });

    res.json({
      success: true,
      query: {
        bloodType: bloodType ? bloodType.toUpperCase() : "ALL",
        minDaysSinceLastDonation: minDaysSinceLastDonation ?? null,
        onlyEligible: effectiveOnlyEligible
      },
      matchedCount: matchedResults.length,
      matches: matchedResults
    });
  } catch (err) {
    res.status(500).json({ error: "매칭 엔진 실행 실패" });
  }
});

// 테스트 환경(jest)이 아닐 때만 실제 포트를 열고 서버를 구동
app.use((err, req, res, next) => {
  res.status(err.status === 413 ? 413 : 400).json({ error: '요청 형식 또는 Origin을 확인하세요.' });
});

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    if (process.env.DID_SEED_DEMO === 'true') await initMockStore();
    app.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`[DID Module] Server running on port ${PORT}`));
  })().catch(() => { console.error('DID startup failed'); process.exit(1); });
}

module.exports = app;
