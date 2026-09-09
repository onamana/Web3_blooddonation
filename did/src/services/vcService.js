const { ethers } = require('ethers');

// 발급기관(혈액원) DID 및 서명용 지갑 키
const ISSUER_WALLET = new ethers.Wallet("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d");
const ISSUER_DID = `did:ethr:${ISSUER_WALLET.address}`;

// W3C 표준 VC 발급 함수 (발급기관의 서명 날인)
async function issueBloodVC(holderAddress, bloodType, isEligible = true) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expirationDate = issuedAt + (180 * 24 * 60 * 60); // 180일 유효

  const credentialSubject = {
    id: `did:ethr:${holderAddress}`,
    bloodType,
    isEligible,
    lastDonationDate: new Date().toISOString().split('T')[0]
  };

  const payloadToSign = JSON.stringify({
    iss: ISSUER_DID,
    sub: credentialSubject.id,
    iat: issuedAt,
    exp: expirationDate,
    credentialSubject
  });

  const proofSignature = await ISSUER_WALLET.signMessage(payloadToSign);

  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "BloodDonationEligibilityCredential"],
    issuer: ISSUER_DID,
    issuanceDate: new Date(issuedAt * 1000).toISOString(),
    expirationDate: new Date(expirationDate * 1000).toISOString(),
    credentialSubject,
    proof: {
      type: "EthereumPersonalSignature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: `${ISSUER_DID}#controller`,
      jws: proofSignature,
      rawPayload: payloadToSign
    }
  };
}

// VC 서명 검증
function verifyBloodVC(vc) {
  try {
    const recoveredAddress = ethers.verifyMessage(vc.proof.rawPayload, vc.proof.jws);
    const isIssuerValid = recoveredAddress.toLowerCase() === ISSUER_WALLET.address.toLowerCase();
    const isExpired = new Date(vc.expirationDate).getTime() < Date.now();
    return isIssuerValid && !isExpired;
  } catch (err) {
    return false;
  }
}

// 인메모리 VC 저장소
let vcDatabase = [];

async function initMockStore() {
  vcDatabase = [
    await issueBloodVC("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "O", true),
    await issueBloodVC("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "A", true),
    await issueBloodVC("0x90F79bf6EB2c4f870365E785982E1f101E93b906", "O", false)
  ];
  console.log(`[DID Store] 3건의 서명된 VC 로드 완료 (Issuer: ${ISSUER_DID})`);
}

// 병원 매칭 조건 필터링 (서명 유효성 + 혈액형 + 적격 여부)
// did/src/services/vcService.js 내부의 matchCandidates 함수 수정

async function matchCandidates({ bloodType, recentDonationWithinDays, onlyEligible = true }) {
  const validCandidates = [];
  const now = new Date();

  for (const vc of vcDatabase) {
    if (!verifyBloodVC(vc)) continue;

    const sub = vc.credentialSubject;

    // 1. 혈액형 필터링
    if (bloodType && sub.bloodType !== bloodType) continue;

    // 2. 적격 여부 필터링
    if (onlyEligible && !sub.isEligible) continue;

    // 3. 최근 N일 이내 헌혈 여부 필터링
    if (recentDonationWithinDays && sub.lastDonationDate) {
      const lastDate = new Date(sub.lastDonationDate);
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > recentDonationWithinDays) continue;
    }

    validCandidates.push({
      holderDid: sub.id,
      bloodType: sub.bloodType,
      isEligible: sub.isEligible,
      lastDonationDate: sub.lastDonationDate,
      issuerDid: vc.issuer,
      verifiedSignature: true
    });
  }

  return validCandidates;
}

module.exports = {
  ISSUER_DID,
  issueBloodVC,
  verifyBloodVC,
  initMockStore,
  matchCandidates,
  getStoredVCs: () => vcDatabase
};