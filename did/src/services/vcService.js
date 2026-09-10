const { ethers } = require('ethers');

// 1. 발급기관 개인키 검증 및 로드
if (!process.env.DID_ISSUER_PRIVATE_KEY) {
  throw new Error("CRITICAL: DID_ISSUER_PRIVATE_KEY 환경변수가 설정되지 않았습니다.");
}

const issuerWallet = new ethers.Wallet(process.env.DID_ISSUER_PRIVATE_KEY);
const ISSUER_ADDRESS = ethers.getAddress(issuerWallet.address);
const ISSUER_DID = `did:ethr:${ISSUER_ADDRESS}`;

// 인메모리 저장소
let vcDatabase = [];

/**
 * 객체 속성 순서에 구애받지 않는 결정론적 Canonical JSON 직렬화
 */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => `"${key}":${canonicalStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * 1. W3C 규격 VC 발급
 */
async function issueBloodVC({ holderAddress, bloodType, isEligible = true, lastDonationDate, daysValid = 90 }) {
  const normalizedHolder = ethers.getAddress(holderAddress);
  const now = new Date();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expirationTime = issuedAt + (daysValid * 24 * 60 * 60);
  const effectiveLastDonationDate = lastDonationDate || now.toISOString().split('T')[0];

  const credentialSubject = {
    id: `did:ethr:${normalizedHolder}`,
    bloodType: bloodType,
    isEligible: Boolean(isEligible),
    lastDonationDate: effectiveLastDonationDate
  };

  const payloadToSign = {
    iss: ISSUER_DID,
    sub: credentialSubject.id,
    iat: issuedAt,
    exp: expirationTime,
    credentialSubject: credentialSubject
  };

  const canonicalPayload = canonicalStringify(payloadToSign);
  const signature = await issuerWallet.signMessage(canonicalPayload);

  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type: ["VerifiableCredential", "BloodDonationEligibilityCredential"],
    issuer: ISSUER_DID,
    issuanceDate: new Date(issuedAt * 1000).toISOString(),
    expirationDate: new Date(expirationTime * 1000).toISOString(),
    credentialSubject,
    proof: {
      type: "EthereumPersonalSignature2020",
      created: now.toISOString(),
      verificationMethod: `${ISSUER_DID}#controller`,
      proofPurpose: "assertionMethod",
      jws: signature,
      rawPayload: canonicalPayload
    }
  };
}

/**
 * 2. 위변조 검증 (외부 필드 vs 서명된 Payload 엄격 대조)
 */
function verifyBloodVC(vc) {
  try {
    if (!vc || !vc.proof || !vc.proof.rawPayload || !vc.proof.jws || !vc.credentialSubject) {
      return { isValid: false, reason: "VC 필수 블록 누락" };
    }

    const { rawPayload, jws } = vc.proof;
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(rawPayload);
    } catch {
      return { isValid: false, reason: "Payload JSON 파싱 실패" };
    }

    // 1) 서명 복구
    const recoveredAddress = ethers.verifyMessage(rawPayload, jws);
    if (ethers.getAddress(recoveredAddress) !== ISSUER_ADDRESS) {
      return { isValid: false, reason: "발급자 서명 불일치" };
    }

    // 2) 발급자 및 만료일 변조 확인
    if (vc.issuer !== parsedPayload.iss || vc.issuer !== ISSUER_DID) {
      return { isValid: false, reason: "VC issuer 불일치" };
    }

    const expTimeFromVC = Math.floor(new Date(vc.expirationDate).getTime() / 1000);
    if (expTimeFromVC !== parsedPayload.exp) {
      return { isValid: false, reason: "VC 만료일(expirationDate) 변조 감지" };
    }

    // 3) 클레임 속성(credentialSubject) 변조 확인
    const sub = vc.credentialSubject;
    const pSub = parsedPayload.credentialSubject;
    if (
      sub.id !== parsedPayload.sub ||
      sub.id !== pSub.id ||
      sub.bloodType !== pSub.bloodType ||
      sub.isEligible !== pSub.isEligible ||
      sub.lastDonationDate !== pSub.lastDonationDate
    ) {
      return { isValid: false, reason: "credentialSubject 변조 감지" };
    }

    // 4) 재구성된 Canonical Payload 일치 검증
    const reconstructedCanonical = canonicalStringify({
      iss: vc.issuer,
      sub: sub.id,
      iat: Math.floor(new Date(vc.issuanceDate).getTime() / 1000),
      exp: expTimeFromVC,
      credentialSubject: sub
    });

    if (rawPayload !== reconstructedCanonical) {
      return { isValid: false, reason: "Canonical Payload 불일치" };
    }

    // 5) 유효기간 만료 확인
    if (new Date(vc.expirationDate).getTime() < Date.now()) {
      return { isValid: false, reason: "만료된 VC입니다." };
    }

    return {
      isValid: true,
      verifiedData: {
        issuer: parsedPayload.iss,
        holderDid: parsedPayload.sub,
        ...parsedPayload.credentialSubject
      }
    };
  } catch (err) {
    return { isValid: false, reason: `검증 예외: ${err.message}` };
  }
}

/**
 * 3. 적격자 매칭
 */
async function matchCandidates({ bloodType, minDaysSinceLastDonation, onlyEligible = true }) {
  const validMatches = [];
  const now = new Date();

  for (const vc of vcDatabase) {
    const verification = verifyBloodVC(vc);
    if (!verification.isValid) continue;

    const data = verification.verifiedData;

    if (bloodType && data.bloodType !== bloodType) continue;
    if (onlyEligible && !data.isEligible) continue;

    if (minDaysSinceLastDonation !== undefined && data.lastDonationDate) {
      const lastDate = new Date(data.lastDonationDate);
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays < minDaysSinceLastDonation) continue;
    }

    validMatches.push({
      holderDid: data.holderDid,
      bloodType: data.bloodType,
      isEligible: data.isEligible,
      lastDonationDate: data.lastDonationDate,
      issuerDid: data.issuer,
      verifiedSignature: true
    });
  }

  return validMatches;
}

/**
 * 4. 서버 시작 시 테스트용 초기 목업 VC 로드 (동적 전자서명)
 */
async function initMockStore() {
  vcDatabase = [
    await issueBloodVC({
      holderAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      bloodType: "O",
      isEligible: true,
      lastDonationDate: "2026-08-01"
    }),
    await issueBloodVC({
      holderAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      bloodType: "A",
      isEligible: true,
      lastDonationDate: "2026-07-15"
    }),
    await issueBloodVC({
      holderAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      bloodType: "O",
      isEligible: false,
      lastDonationDate: "2026-08-20"
    })
  ];
  console.log(`[DID Store] 3건의 동적 서명 목업 VC 로드 완료 (Issuer: ${ISSUER_DID})`);
}

module.exports = {
  ISSUER_DID,
  ISSUER_ADDRESS,
  issueBloodVC,
  verifyBloodVC,
  matchCandidates,
  initMockStore,
  getStoredVCs: () => vcDatabase,
  setStoredVCs: (newList) => { vcDatabase = newList; }
};