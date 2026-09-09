# contract

A(스마트컨트랙트) 작업 디렉터리. Hardhat 기반. 루트 README "제출용 MVP 목표"의 블로커 항목
(증서 컨트랙트 `issue`/발급자 롤)을 이 디렉터리에서 구현한다.

## 세팅

```bash
cd contract
npm install
cp .env.example .env   # 값 채워넣기
npm run compile
npm test
```

- `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`: Sepolia 배포에 필요
- `BACKEND_SIGNER_ADDRESS`: C(백엔드)의 relayer 지갑 주소. 배포 스크립트가 이 주소에 `ISSUER_ROLE`/
  `RECORDER_ROLE`을 부여한다. `backend/.env`의 `BACKEND_SIGNER_PRIVATE_KEY`에 대응하는 주소를 받아서 채운다.
- `ETHERSCAN_API_KEY`: 배포 후 `npm run verify:sepolia`로 소스 검증할 때 필요 (선택)

## 구조

- `contracts/BloodCertificate.sol` — 헌혈 증서 ERC-721. `backend/contracts/BloodCertificate.sample.abi.json`
  과 함수/이벤트 시그니처를 1:1로 맞춰야 한다 (바뀌면 양쪽 다 갱신).
- `contracts/DonationRegistry.sol` — 헌혈 이력 해시 등록 컨트랙트. `backend/contracts/DonationRegistry.sample.abi.json`
  과 대응. 증서 MVP와는 별도 트랙(루트 README 참고).
- `scripts/deploy.js` — 두 컨트랙트 배포 + `BACKEND_SIGNER_ADDRESS`에 롤 부여까지 한 번에 처리
- `test/` — Hardhat + chai 테스트

## 배포 후 C에게 전달할 것

1. `BloodCertificate` 배포 주소 → `backend/.env`의 `CERTIFICATE_CONTRACT_ADDRESS`
2. `DonationRegistry` 배포 주소 → `backend/.env`의 `DONATION_CONTRACT_ADDRESS`
3. 실제 ABI (컴파일 후 `artifacts/contracts/*/*.json`의 `abi` 필드) → 두 `*.sample.abi.json`을 대체

## 롤 설계

- `ISSUER_ROLE` (`BloodCertificate`): `issue()`, `markUsed()` 호출 권한. 배포자와 C의 relayer 지갑에 부여.
  MVP 단계에서는 발급과 병원 사용 처리를 같은 롤로 묶었다 — 다중 혈액원/병원별 분리가 필요해지면
  갈라야 한다 (루트 README "C가 남긴 것" 참고).
- `RECORDER_ROLE` (`DonationRegistry`): `record()` 호출 권한.
