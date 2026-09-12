const { Wallet } = require('ethers');
process.env.NODE_ENV = 'test';
process.env.DID_ISSUER_PRIVATE_KEY = Wallet.createRandom().privateKey;
process.env.DID_ISSUE_API_KEY = 'test-only-internal-key';
const { issueBloodVC, verifyBloodVC, matchCandidates, setStoredVCs } = require('../src/services/vcService');
const input = { holderAddress: Wallet.createRandom().address, bloodType: 'O', isEligible: true, lastDonationDate: '2026-01-01', daysValid: 90 };

beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-04-01T00:00:00Z')); setStoredVCs([]); });
afterEach(() => jest.useRealTimers());

test.each(['id', 'issuanceDate', 'lastDonationDate', 'signature', 'payload', 'proof', 'subject'])('rejects mutation or missing %s', async field => {
  const vc = await issueBloodVC(input);
  if (field === 'id') vc.id += 'changed';
  if (field === 'issuanceDate') vc.issuanceDate = '2020-01-01T00:00:00Z';
  if (field === 'lastDonationDate') vc.credentialSubject.lastDonationDate = '2025-01-01';
  if (field === 'signature') vc.proof.jws = 'not-a-signature';
  if (field === 'payload') vc.proof.rawPayload = '{';
  if (field === 'proof') delete vc.proof;
  if (field === 'subject') delete vc.credentialSubject;
  const result = verifyBloodVC(vc);
  expect(result.isValid).toBe(false);
  expect(JSON.stringify(result)).not.toMatch(/node_modules|privateKey|stack|invalid BytesLike/);
});
test('object order does not change verification', async () => {
  const vc = await issueBloodVC(input);
  vc.credentialSubject = Object.fromEntries(Object.entries(vc.credentialSubject).reverse());
  expect(verifyBloodVC(vc).isValid).toBe(true);
});
test('expiration is exclusive and expired credentials are excluded', async () => {
  const vc = await issueBloodVC({ ...input, daysValid: 1 });
  setStoredVCs([vc]);
  const expiry = Date.parse(vc.expirationDate);
  expect(Date.parse(vc.issuanceDate)).toBe(Date.now());
  expect(expiry - Date.now()).toBe(86400000);
  jest.setSystemTime(expiry - 1); expect(verifyBloodVC(vc).isValid).toBe(true);
  jest.setSystemTime(expiry); expect(verifyBloodVC(vc).isValid).toBe(false);
  expect(await matchCandidates({ onlyEligible: false })).toHaveLength(0);
  jest.setSystemTime(expiry + 1); expect(verifyBloodVC(vc).isValid).toBe(false);
});
test('minimum elapsed days includes exactly the boundary; eligibility is independent', async () => {
  const vc = await issueBloodVC({ ...input, lastDonationDate: '2026-03-01', isEligible: false });
  setStoredVCs([vc]);
  expect(await matchCandidates({ minDaysSinceLastDonation: 30, onlyEligible: false })).toHaveLength(1);
  expect(await matchCandidates({ minDaysSinceLastDonation: 31, onlyEligible: false })).toHaveLength(1);
  expect(await matchCandidates({ minDaysSinceLastDonation: 32, onlyEligible: false })).toHaveLength(0);
  expect(await matchCandidates({ onlyEligible: true })).toHaveLength(0);
});
test('another issuer cannot sign accepted credentials', async () => {
  const vc = await issueBloodVC(input);
  vc.proof.jws = await Wallet.createRandom().signMessage(vc.proof.rawPayload);
  expect(verifyBloodVC(vc).isValid).toBe(false);
});
