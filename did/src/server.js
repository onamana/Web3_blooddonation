require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const {
  ISSUER_DID,
  matchCandidates,
  issueBloodVC,
  verifyBloodVC,
  getStoredVCs,
  initMockStore
} = require('./services/vcService');

const app = express();
const PORT = process.env.PORT || 5001;
const ALLOWED_BLOOD_TYPES = ['A', 'B', 'AB', 'O'];

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

app.use(express.json());

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
  if (apiKey !== expectedKey) {
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
  res.json(getStoredVCs());
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

    if (!bloodType || !ALLOWED_BLOOD_TYPES.includes(bloodType.toUpperCase())) {
      return res.status(400).json({ error: `지원하지 않는 혈액형입니다. (${ALLOWED_BLOOD_TYPES.join(', ')})` });
    }

    if (isEligible !== undefined && typeof isEligible !== 'boolean') {
      return res.status(400).json({ error: "isEligible 필드는 boolean 타입이어야 합니다." });
    }

    if (lastDonationDate && isNaN(Date.parse(lastDonationDate))) {
      return res.status(400).json({ error: "유효한 날짜 형식이 아닙니다. (예: YYYY-MM-DD)" });
    }

    const vc = await issueBloodVC({
      holderAddress: ethers.getAddress(holderAddress),
      bloodType: bloodType.toUpperCase(),
      isEligible: isEligible ?? true,
      lastDonationDate,
      daysValid: daysValid ? parseInt(daysValid, 10) : 90
    });

    getStoredVCs().push(vc);
    res.status(201).json({ success: true, vc });
  } catch (err) {
    res.status(500).json({ error: "VC 발급 처리 실패" });
  }
});

// 적격자 매칭 API
app.post('/match', async (req, res) => {
  try {
    const { bloodType, minDaysSinceLastDonation, onlyEligible } = req.body;

    if (bloodType && !ALLOWED_BLOOD_TYPES.includes(bloodType.toUpperCase())) {
      return res.status(400).json({ error: "허용되지 않은 혈액형 쿼리입니다." });
    }

    if (minDaysSinceLastDonation !== undefined) {
      const days = Number(minDaysSinceLastDonation);
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    await initMockStore();
    console.log(`[DID Module] Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;