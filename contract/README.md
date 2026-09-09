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

## 배포 현황 (Sepolia, 2026-09-09)

- Deployer: `0x19Ff20dDBEa7717f10be6825Bff2ac2Aac193af0`
- **BloodCertificate**: `0x0b72339558d31921711A8fEB0719d885A3076cE7`
  ([Etherscan](https://sepolia.etherscan.io/address/0x0b72339558d31921711A8fEB0719d885A3076cE7))
- **DonationRegistry**: `0x91304aC763ef386CF65950C2e9bfb53528C0d8Ae`
  ([Etherscan](https://sepolia.etherscan.io/address/0x91304aC763ef386CF65950C2e9bfb53528C0d8Ae))
- `BACKEND_SIGNER_ADDRESS`를 아직 안 받아서 롤 부여는 스킵됨. C의 relayer 지갑 주소를 받으면
  두 컨트랙트에 `ISSUER_ROLE`/`RECORDER_ROLE`을 수동으로 부여해야 backend가 `issue()`/`record()`를
  호출할 수 있다.

## TODO — 배포됐지만 아직 연결 안 된 부분

컨트랙트가 Sepolia에 실재하는 것과, 전체 파이프라인(프론트→백엔드→체인)이 실제로 동작하는 것은 다르다.
아래가 모두 해결돼야 데모의 가짜 데이터/가짜 트랜잭션 해시가 실제 온체인 값으로 바뀐다.

- [ ] **backend가 배포 주소를 모름.** `backend/.env`의 `CERTIFICATE_CONTRACT_ADDRESS`/
  `DONATION_CONTRACT_ADDRESS`가 비어있어 `/certificate`가 여전히 501을 응답한다 → 위 "배포 후
  C에게 전달할 것" 1·2번 전달 필요.
- [ ] **backend의 relayer 지갑에 롤이 없음.** `BACKEND_SIGNER_ADDRESS`를 받아 `ISSUER_ROLE`/
  `RECORDER_ROLE`을 부여하기 전까지는, 주소를 넣어도 backend가 `issue()`/`record()` 호출 시
  권한 없음으로 revert된다.
- [ ] **frontend는 여전히 데모 모드.** `VITE_DEMO_MODE=true`로 인메모리 목업 데이터를 쓰고 있어
  화면상 변화가 없다. 위 두 항목이 끝나고 D가 데모 모드를 꺼야 실제 체인 데이터가 보인다.
