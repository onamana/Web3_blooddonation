# BloodPass — 헌혈 증서 · DID 자격 검증

혈액형을 온체인에 기록하지 않는 Web3 헌혈증서 및 자격 검증 데모입니다.
**[로컬 데모 실행과 HTTPS 배포 안내](docs/demo-deployment.md)**에서 설치·로그인·시연·배포·백업 절차를 확인하세요.

## 현재 연결 (2026-09-11)

| 구성 | 역할 |
| --- | --- |
| frontend | 기존 증서 화면 + 자격 등록·검증·취소·후보자 검색, 데모 로그인 |
| backend | API, relayer, SQLite에 헌혈 종류·헌혈량 보관 |
| BloodCertificate | 증서 소유권·발급·양도·사용 이력 (ERC-721) |
| DonationRegistry | 혈액형 없는 기록 식별자 해시·시각 |
| DID/VC | 백엔드 `/credentials`·`/match`와 연결, SQLite 저장, 갱신·취소·서명 검증 |

발급·사용은 백엔드 signer가 수행하고, 양도는 소유자의 EIP-712 서명을 백엔드가 `transferWithAuthorization`으로 릴레이합니다.
프론트는 조회할 때 백엔드가 합친 온체인 상태와 오프체인 메타데이터를 받습니다.
혈액형/Rh는 증서·헌혈 기록 API와 두 컨트랙트에 포함하지 않습니다. 자격 VC는 혈액형·적격 여부·최근 헌혈일을 별도 DID DB에 보관합니다. 가상 정보만 입력하는 초대형 데모이며 실제 병원 연동은 포함하지 않습니다.

## Sepolia 새 배포

아래는 초기 배포 기록입니다. 현재 기능에 맞는 주소는 `contract/deployments/`의 사용 대상 manifest와 `scripts/preflight-demo.mjs` 검사로 확인하세요.

- BloodCertificate: `0x622bC4B23a5e13CA4d5208b578c38e8d360944fB`
- DonationRegistry: `0x689390A0D4aD3F0e5ae49a0362785035507CbFb4`
- 증서 배포 블록: `11675549`
- 배포/권한 기록: [deployment manifest](contract/deployments/sepolia-1789050854974.json)
- 실제 Sepolia 발급·양도·사용/차단 검증 완료: [거래 증빙](contract/deployments/sepolia-smoke-1789050986200.json).

과거 README에 적힌 혈액형 포함 버전의 주소는 현재 ABI와 호환되지 않습니다.
기존 증서는 새 주소로 자동 이전되지 않으며 이전 온체인 기록도 삭제되지 않습니다.

## 실행과 검증

Node.js 22.13 이상이 필요합니다 (검증 환경 Node 24). 각 폴더에서 `npm ci`로 설치합니다.

```powershell
cd contract
npm test
npm run sync:abi
cd ../frontend
npm run typecheck
npm run lint
npm run build
cd ../backend
npm run test:integration
```

통합 테스트는 브라우저 없이 실제 프론트 API 함수 → HTTP 백엔드 → 임시 로컬 블록체인으로 검증합니다.
실행 후 로컬 테스트 프로세스는 종료됩니다. 실제 Sepolia 거래를 보내는 `backend/npm run test:sepolia`와 구분하세요.

앱 실행은 backend에서 `npm run dev`, frontend에서 `npm run dev`입니다.
프론트 API 주소는 기본 `http://localhost:4000`, Swagger는 `http://localhost:4000/docs`입니다.

## 문서

- [전체 통합/재배포/환경변수 가이드](docs/contract-integration.md)
- [컨트랙트](contract/README.md)
- [백엔드](backend/README.md)
- [프론트엔드](frontend/README.md)

현재는 시연용입니다. 직원 로그인·병원 권한·등록 헌혈자/검사정보 DB 검증은 미구현이며,
컨트랙트의 relayer 권한이 HTTP API 이용자를 인증해 주지는 않습니다.
SQLite는 단일 백엔드 프로세스를 전제로 합니다. 공개 운영 전 인증과 운영 DB/공유 작업 큐가 필요합니다.
