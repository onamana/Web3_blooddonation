# 혈액형 없는 증서 통합 (2026-09-10)

## 기준과 현재 상태

- 기준 화면은 로컬 `main`의 `2df9770` (`did + contract 반영전`). GitHub main과 구분한다.
- 해당 화면의 헌혈 종류/헌혈량 발급 형식을 `contract` 작업본에 반영했다.
- 두 컨트랙트와 증서/헌혈 기록 API에서 혈액형을 제거했다. DID 매칭의 혈액형 조건은 별도 오프체인 기능이다.
- 로컬 컨트랙트 테스트 및 실제 프론트 API 함수를 이용한 브라우저 없는 통합 테스트를 제공한다.
- Sepolia 신규 배포와 롤 부여 완료. [배포 manifest](../contract/deployments/sepolia-1789050854974.json) 참고. 이전 혈액형 포함 버전의 주소는 이 ABI와 호환되지 않는다.
- 현재 작업본에 대한 변경이며 main 병합/커밋/push는 아직 하지 않았다.
- 실제 Sepolia 검증 완료: [증빙](../contract/deployments/sepolia-smoke-1789050986200.json).
  테스트 증서 0번은 양도 후 사용 완료 상태다. Etherscan 소스 공개 검증은 API 키 미설정으로 미실행이다.

## 데이터와 호출 방식

| 정보/기능 | 위치/경로 |
| --- | --- |
| 증서 소유자, 발급기관/시각, 사용 상태/이력 | BloodCertificate (ERC-721) |
| 헌혈 기록 식별자 해시, 시각 | DonationRegistry |
| 헌혈 종류, 전혈 헌혈량 | 백엔드 SQLite |
| 혈액형/Rh | 온체인 및 공개 증서 API에 없음. main의 기존 가상 검사정보는 프론트 데모 전용 |
| 양도 | 소유자 지갑이 safeTransferFrom 직접 호출 |
| 발급/사용 | 백엔드 signer가 ISSUER_ROLE로 호출 |

SQLite 기본 위치는 `backend/data/certificates.sqlite`. `CERTIFICATE_DB_PATH`로 변경할 수 있다.
키는 체인 ID + 컨트랙트 주소 + tokenId이므로 재배포/다른 체인의 0번 증서와 혼동하지 않는다.
DB를 지우면 종류/헌혈량은 복원되지 않는다. SQLite 파일과 WAL을 안전하게 백업해야 한다.
외부에서 직접 발급된 증서는 해당 메타데이터가 없을 수 있으며 응답에서는 선택 필드로 처리한다.
지갑-증서 관계와 이력은 공개되며 이 설계가 익명성을 보장하지는 않는다.

## 발급 API

`POST /certificate/issue`, 헤더 `Idempotency-Key` (영숫자/밑줄/하이픈, 16~100자):

```json
{ "to": "0x수령지갑", "donationType": "WHOLE_BLOOD", "volumeMl": 400 }
```

- 종류: WHOLE_BLOOD, PLASMA, PLATELETS, PLATELETS_PLASMA.
- 전혈은 volumeMl 320 또는 400 필수. 성분헌혈에는 volumeMl을 보내지 않는다.
- 혈액형/Rh/issuer 등 추가 필드는 거절한다. issuer는 서버의 BLOOD_CENTER_NAME에서 정한다.
- 요청 키와 서명된 트랜잭션을 DB에 먼저 저장한 뒤 전송한다. 같은 키/같은 입력의 재시도는 같은 거래를 복구한다.
- 같은 키에 다른 입력은 409. 전송 여부가 불명확한 이전 발급이 있으면 새 발급은 차단하고 이전 키로 재시도한다.
- 새로고침 후에도 같은 입력의 재시도 키를 sessionStorage에서 복원한다. '새 증서 발급'은 새 키를 만든다.
- 이 메커니즘은 같은 요청 키의 중복 거래 방지이며, 동일한 실제 헌혈 건에 여러 새 키로 발급하는 것을 검증하지는 않는다.
- 배포된 새 컨트랙트 함수는 `issue(address to, string issuer)`이다. 헌혈 종류/헌혈량도 거래 calldata에 넣지 않는다.

`POST /donation/auth`는 address/message/signature만 받는다. 무작위 식별자 해시를 기록하며 혈액형을 요구하거나 반환하지 않는다.
이 라우트의 서명 재사용 방지/실제 헌혈 적격 확인은 이번 증서 통합 범위 밖이다.

## 브라우저 없는 검증

Node.js 22.13 이상 필요 (SQLite 내장 API). 검증 환경은 Node 24.

```powershell
cd contract
npm ci
npm test
npm run sync:abi
cd ../frontend
npm ci
npm run typecheck
npm run lint
npm run build
cd ../backend
npm ci
npm run test:integration
```

통합 테스트는 임시 로컬 체인/임시 DB/임의의 로컬 테스트 지갑을 만들고 종료한다.
프론트의 실제 API 모듈을 번들링해 HTTP API와 연결하며 지갑 RPC 어댑터로 실제 전송을 수행한다.
발급/목록/상세/양도/사용/재사용 및 사용 후 양도 차단, 잘못된 입력, DB 재시작,
전송 전·채굴 후 중단된 발급 복구, ABI 일치를 확인한다. Sepolia 자금과 브라우저가 필요 없다.
MetaMask 팝업/사용자 클릭/레이아웃 자체의 검증은 포함하지 않는다.

## 새 컴퓨터에서 임시 환경 설정

```powershell
cd contract
npm run setup:demo
```

세 .env가 모두 없을 때만 실행할 수 있다. 새 테스트 지갑을 생성하고 PublicNode Sepolia RPC를 검증한 뒤,
개인키를 출력하지 않고 contract/.env와 backend/.env에 저장한다. frontend/.env에는 공개 설정만 쓴다.
이 지갑은 배포자와 백엔드 relayer를 겸하는 테스트 전용이다. 기존 자산/권한은 이전되지 않는다.
새 지갑에 Sepolia 테스트 ETH를 받은 후 진행한다. Etherscan API 키는 자동 발급하지 않는다.

## 배포 및 연결

```powershell
cd contract
npm run compile
npm run sync:abi
npm run preflight:sepolia
npm run deploy:sepolia
```

preflight는 양쪽 RPC의 Sepolia 여부, 지갑 일치, 잔액과 대략적인 가스 예산을 확인한다.
배포 스크립트는 두 컨트랙트를 새로 배포하고 롤을 부여한다. 진행 상태는 `contract/deployments/sepolia-*.json`에 저장한다.
부분 실패 시 manifest/거래를 먼저 확인한다. 명령을 무작정 다시 실행하면 새 주소가 또 만들어질 수 있다.

배포 후 manifest에서 아래 값을 연결한다.

| 환경파일 변수 | 배포 결과 |
| --- | --- |
| backend CERTIFICATE_CONTRACT_ADDRESS | BloodCertificate.address |
| backend CERTIFICATE_DEPLOY_BLOCK | BloodCertificate.blockNumber |
| backend DONATION_CONTRACT_ADDRESS | DonationRegistry.address |
| frontend VITE_CERTIFICATE_CONTRACT_ADDRESS | 같은 BloodCertificate.address |
| frontend VITE_DEMO_MODE | false |
| frontend VITE_CHAIN_ID | 0xaa36a7 |

백엔드는 재시작, 프론트는 다시 빌드한다. 기존 .env를 덮어쓸 때 개인키를 출력하거나 Git에 커밋하지 않는다.
ABI는 sync:abi가 컴파일 결과에서 생성한다. 이전 주소에 새 ABI를 붙이지 않는다.
기존 온체인 데이터/증서는 삭제되거나 새 주소로 자동 이동하지 않는다.

Etherscan 키가 있으면 각각 실행한다 (마지막 인수는 constructor admin인 배포 지갑 주소).

```powershell
npm run verify:sepolia -- <BloodCertificate주소> <배포지갑주소>
npm run verify:sepolia -- <DonationRegistry주소> <배포지갑주소>
```

## 범위와 후속 작업

- 현재는 데모용 API이며 직원 로그인/병원 권한/등록된 헌혈자 DB/검사정보 검증은 아직 구현하지 않았다.
  컨트랙트 롤은 HTTP API 호출자를 인증하지 않는다. 공개 운영 서버로 서비스하기 전 별도 인증이 필요하다.
- 하나의 백엔드 프로세스가 relayer를 전담한다. 다중 인스턴스는 공유 작업 큐와 별도 nonce 관리가 필요하다.
- 실제 혈액 검사정보 DB와 DID/VC 발급 연동은 이번 변경에 포함하지 않는다.
- 개발 도구 의존성 업그레이드 및 MetaMask 브라우저 실사용 확인은 별도 작업이다.
