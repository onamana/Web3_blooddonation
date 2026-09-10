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

`npm install` 후 `npm run compile`(19개 파일 컴파일 성공)과 `npm test`(17 passing: BloodCertificate
10건 + DonationRegistry 7건)로 검증 완료(2026-09-10).

### 의존성 취약점 (2026-09-10 확인)

`npm audit` 기준 46건(19 low·10 moderate·17 high)이 있지만 전부 Hardhat 개발 툴체인 devDependency
쪽(`eth-gas-reporter`가 물고 오는 ethers v5, `solc`의 `tmp`, hardhat 자체의 `undici`/`uuid`/`ws`)이라
배포되는 컨트랙트 bytecode에는 영향이 없다. `npm audit fix`(non-breaking)로는 고쳐지는 게 없고,
전부 `hardhat@3` / `@nomicfoundation/hardhat-toolbox@7`로의 breaking 업그레이드가 필요하다 —
`hardhat.config.js`/배포·검증 스크립트 재검증이 필요해서 지금은 보류하기로 결정함. 나중에 여유
있을 때 업그레이드 후 `npm test`/`npm run deploy:sepolia`가 그대로 동작하는지 확인할 것.

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

## 양도(transfer) 정책

- `BloodCertificate`는 relayer(백엔드) 릴레이 없이 소유자의 지갑이 `safeTransferFrom()`을
  직접 호출하는 구조다. `ISSUER_ROLE`은 `issue()`/`markUsed()` 권한만 줄 뿐 ERC-721 전송 권한과는
  무관하므로, 백엔드가 `transferFrom`을 대신 보내려면 소유자가 먼저 `approve()`를 해야 하고
  (그 UX가 없으면 항상 `ERC721InsufficientApproval`로 revert된다) — 그래서 이 구조를 택하지 않았다.
- 사용 완료(`used == true`)된 증서는 `_update()` override가 온체인에서 양도를 막는다
  (`UsedCertificateCannotBeTransferred`). 민팅(`from == address(0)`)은 막지 않는다.

## 배포 현황 (Sepolia, 2026-09-10 재배포)

코드 리뷰 결과로 `BloodCertificate.sol`(혈액형 검증, 사용 후 양도 차단)/`DonationRegistry.sol`
(혈액형 검증)이 수정되어 bytecode가 바뀌었다. 2026-09-09에 배포했던 두 주소(`0x0b72339...`,
`0x91304aC...`)는 폐기하고 아래 주소로 교체했다 — **Etherscan 검증은 새 주소 기준으로 다시 해야 한다.**

- Deployer / backend relayer(재사용): `0x19Ff20dDBEa7717f10be6825Bff2ac2Aac193af0`
- **BloodCertificate**: `0xe40095227878Bda97d163815558b2f38D4F12A03`
  ([Etherscan, 소스 검증 완료](https://sepolia.etherscan.io/address/0xe40095227878Bda97d163815558b2f38D4F12A03#code))
- **DonationRegistry**: `0x3c597Cc42e114B62F40e18995763390b5eDB1a2E`
  ([Etherscan, 소스 검증 완료](https://sepolia.etherscan.io/address/0x3c597Cc42e114B62F40e18995763390b5eDB1a2E#code))
- `ISSUER_ROLE`/`RECORDER_ROLE` 부여 완료. 백엔드 relayer는 별도 지갑을 새로 만들지 않고
  **deployer 지갑을 그대로 재사용**한다 — 두 컨트랙트 모두 constructor에서 `admin`(=deployer)에게
  `ISSUER_ROLE`/`RECORDER_ROLE`을 자동으로 부여하므로 추가 지갑·추가 faucet이 필요 없었다.
  (`backend/.env`의 `BACKEND_SIGNER_PRIVATE_KEY` = `contract/.env`의 `DEPLOYER_PRIVATE_KEY`와 동일)
- `backend/.env`의 `CERTIFICATE_CONTRACT_ADDRESS`/`DONATION_CONTRACT_ADDRESS`, `frontend/.env`의
  `VITE_CERTIFICATE_CONTRACT_ADDRESS`, `backend/contracts/*.sample.abi.json`(실제 ABI로 교체),
  `frontend/.env`의 `VITE_DEMO_MODE=false` 모두 반영 완료.

## TODO — 남은 작업

- [x] **Etherscan 소스 검증 완료 (2026-09-10).** 두 주소 모두 `npm run verify:sepolia`로 검증됨.
- [x] **백엔드 API·온체인 흐름 검증 완료 (2026-09-10).** 실제 Sepolia에서 발급 → 목록 조회 →
  상세 조회 → 소유자 양도(직접 `safeTransferFrom`) → 병원 검증 → 사용 처리 → 재사용 차단(백엔드
  409) → 사용 후 양도 시도(`UsedCertificateCannotBeTransferred` revert 확인)까지 전부 성공.
  (테스트 중 `certificate.js`의 무제한 `queryFilter`가 Infura 블록범위 제한에 걸리는 버그와,
  ethers v6 배치 요청이 무료 Infura에서 일부만 거부되는 문제를 발견해 같이 고쳤다 —
  `CERTIFICATE_DEPLOY_BLOCK` env var, `chain.js`의 `batchMaxCount: 1`.)
- [x] **프론트 UI(브라우저 + MetaMask) 검증 완료 (2026-09-10).** 실제 Chrome + MetaMask +
  Sepolia로 지갑 연결 → 증서 목록 → "양도하기" → MetaMask 서명 → 실제 tx 반영까지 확인.
  과정에서 겪은 이슈와 발견된 개선 여지는 `frontend/README.md` "브라우저 실사용 검증 리포트"
  참고.
