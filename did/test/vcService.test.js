// 테스트 실행 전 더미 개인키 설정
process.env.DID_ISSUER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env.DID_ISSUE_API_KEY = "test-secret-key";

const { issueBloodVC, verifyBloodVC, matchCandidates, setStoredVCs } = require('../src/services/vcService');

describe('DID/VC 무결성 및 위변조 방지 검증 테스트', () => {
  const holder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  test('정상 발급된 VC는 서명 검증을 통과해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: true });
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(true);
    expect(result.verifiedData.bloodType).toBe('O');
  });

  test('혈액형(bloodType)을 변조하면 검증에 실패해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: true });
    vc.credentialSubject.bloodType = 'A'; // 악의적 변조
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(false);
  });

  test('적격 여부(isEligible)를 false에서 true로 변조하면 검증에 실패해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: false });
    vc.credentialSubject.isEligible = true; // 악의적 변조
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(false);
  });

  test('소유자 DID(id)를 변조하면 검증에 실패해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: true });
    vc.credentialSubject.id = "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(false);
  });

  test('발급자(issuer)를 변조하면 검증에 실패해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: true });
    vc.issuer = "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(false);
  });

  test('만료기간(expirationDate)을 임의 연장하면 검증에 실패해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: true });
    vc.expirationDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(false);
  });

  test('만료일이 지난 VC는 검증에 실패해야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: true, daysValid: -1 });
    const result = verifyBloodVC(vc);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("만료");
  });

  test('변조된 VC는 매칭 대상에서 완전히 제외되어야 한다', async () => {
    const vc = await issueBloodVC({ holderAddress: holder, bloodType: 'O', isEligible: false });
    vc.credentialSubject.isEligible = true; // 변조
    setStoredVCs([vc]);

    const matches = await matchCandidates({ bloodType: 'O', onlyEligible: true });
    expect(matches.length).toBe(0);
  });
});