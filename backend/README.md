# backend

Node.js 22.13 이상, Express + ethers + SQLite 기반 시연용 API입니다.
프로젝트 통합 실행과 GitHub CI는 DID 요구사항에 맞춰 Node 24 이상을 기준으로 합니다. 평가용 첫 실행은 [통합 README](../README.md)의 로컬 실행기를 권장합니다.
현재 DID 연동, 로그인과 배포 절차는 [데모 배포 안내](../docs/demo-deployment.md)를 기준으로 합니다.

## 실행

```powershell
npm ci
npm run dev
```

`.env.example`을 참고하되 이미 있는 `.env`를 덮어쓰지 마세요.
기본 실행은 로그인 설정을 요구합니다. 루트에서 `node scripts/setup-did-env.cjs`를 실행하면 기존 키를 보존하면서 DID 내부 키와 접속 암호·세션 키를 준비합니다. 접속 암호는 `backend/.env`의 `DEMO_ACCESS_PASSWORD`에서 확인하세요. 기본 바인딩은 `127.0.0.1`입니다.

인증 없는 로컬 개발이 꼭 필요하면 암호 설정을 비우고 `DEMO_ALLOW_UNAUTHENTICATED=true`를 명시합니다. 이 모드는 production, 비-loopback HOST, TRUST_PROXY=1과 함께 사용할 수 없습니다. 공개 배포는 로그인과 HTTPS가 필요합니다. 로그인 참여자는 공통 데모 운영 권한이며 실제 병원 계정 인증은 아닙니다.
`SEPOLIA_RPC_URL`, `BACKEND_SIGNER_PRIVATE_KEY`, 두 컨트랙트 주소, `CERTIFICATE_DEPLOY_BLOCK`이 필요합니다.
`CHAIN_ID=11155111`, `PORT=4000`이 기본입니다.
`BLOOD_CENTER_NAME`은 서버가 정하는 발급기관입니다.

`CERTIFICATE_DB_PATH` 기본값은 `backend/data/certificates.sqlite`입니다.
이 DB는 헌혈 종류·헌혈량, 재시도 키, 서명된 발급 거래를 저장합니다. 혈액형/Rh는 저장하지 않습니다.
DB와 WAL은 백업 대상이며 Git에는 포함하지 않습니다. 백엔드는 하나의 프로세스로 실행합니다.

Swagger: `http://localhost:4000/docs`, 스펙: `/openapi.json`.

## 최근 보완 사항

| 항목 | 적용 내용 |
| --- | --- |
| 기본 인증 | 로그인 암호 16자 이상·세션 키 32자 이상 요구. 암묵적인 인증 생략 제거 |
| 로컬 개발 예외 | 명시적인 우회 옵션에만 인증 생략 허용. 비운영·loopback·프록시 미사용 조건 검사 |
| 입력 계약 | DID와 혈액형·경과일 기본값/상한 통일, JSON 본문 누락·잘못된 타입·추가 필드 거절 |
| DID 인증 | 브라우저에 내부 키를 주지 않고 서버 간 요청에만 사용 |
| 장애 처리 | DID 인증 실패·내부 장애를 안전한 중계 오류로 반환 |
| 회귀 검증 | 기본 인증·우회 제한 테스트와 양쪽 API에 동일 입력을 보내는 계약 테스트 추가 |

데모 로그인을 사용하면 HttpOnly·SameSite=Strict 쿠키를 발급하고 production에서는 Secure 속성을 추가합니다. 변경 요청에는 `X-Demo-Request: 1` 헤더가 필요합니다. 내부 DID API 키와 접속 암호는 서로 다른 값입니다.

## 환경변수 요약

| 변수 | 역할 |
| --- | --- |
| PORT / HOST | 기본 4000 / 127.0.0.1 |
| DEMO_ACCESS_PASSWORD / DEMO_SESSION_SECRET | 접속 암호 및 쿠키 서명키 |
| DEMO_ALLOW_UNAUTHENTICATED | 기본 비활성화, 명시적인 로컬 개발 예외 |
| ALLOWED_ORIGINS | 기본 http://localhost:5173 |
| DID_MODULE_BASE_URL / DID_ISSUE_API_KEY | DID 주소(기본 5001)와 양쪽에서 공유하는 내부 키 |
| SEPOLIA_RPC_URL / CHAIN_ID | 사용할 체인 연결 |
| BACKEND_SIGNER_PRIVATE_KEY | 거래 릴레이용 지갑, DID 발급키와 별도 역할 |
| CERTIFICATE_CONTRACT_ADDRESS / CERTIFICATE_DEPLOY_BLOCK | 증서 조회·거래 및 로그 시작 블록 |
| DONATION_CONTRACT_ADDRESS | 기록 컨트랙트 |
| CERTIFICATE_DB_PATH | 증서 SQLite 경로 |

`.env` 변경 후 백엔드 프로세스를 재시작하세요. 브라우저 강력 새로고침으로 서버 환경변수는 갱신되지 않습니다. `setup-did-env.cjs`는 로그인/DID 키 설정 도구이며 RPC 설정이나 컨트랙트 배포까지 수행하지 않습니다.

## 증서 API

| API | 동작 |
| --- | --- |
| GET /certificate?owner=0x... | 현재 보유 목록 |
| GET /certificate/:tokenId | 상세와 이벤트 이력 |
| GET /certificate/:tokenId/verify | valid / used / notfound |
| POST /certificate/issue | 지갑·헌혈 종류·헌혈량으로 발급 |
| POST /certificate/:tokenId/use | hospital 문자열로 사용 처리 |

발급 요청:

```json
{ "to": "0x수령자", "donationType": "WHOLE_BLOOD", "volumeMl": 400 }
```

`Idempotency-Key` 헤더 필수 (영숫자/밑줄/하이픈 16~100자).
전혈은 320/400mL 필수, 성분헌혈(PLASMA/PLATELETS/PLATELETS_PLASMA)은 volumeMl을 생략합니다.
혈액형, Rh, issuer 등 추가 입력은 거절합니다. 같은 키/입력의 재시도는 기존 발급을 복구합니다.
같은 키에 다른 입력은 409입니다. 응답의 종류/헌혈량은 DB에서 합치며 온체인에는 올리지 않습니다.

`POST /certificate/:tokenId/transfer`는 소유자의 EIP-712 서명을 검증한 뒤 `transferWithAuthorization`으로 릴레이합니다. 사용자가 가스비를 부담하지 않습니다.
사용된 증서는 컨트랙트가 양도를 차단합니다. 재사용 요청은 409입니다.

## 별도 기능

- POST /donation/auth: address/message/signature → 무작위 기록 해시와 시각 등록 (혈액형 없음).
- GET /donation/verify/:hash, GET /donation/:hash: 해시 기록 조회.
- POST /match: DID_MODULE_BASE_URL의 /match로 중계. bloodType/minDaysSinceLastDonation/onlyEligible을 검증합니다.
- POST /credentials/issue, /credentials/verify, /credentials/revoke: DID 자격 발급·검증·취소. 내부 키는 서버만 사용합니다.
- GET /session, POST /session/login, POST /session/logout: 초대형 데모 접속. production에서는 로그인 설정이 필수입니다.

## 테스트

```powershell
npm.cmd run test:security
npm.cmd run test:integration
npm.cmd run test:did
```

contract/frontend 의존성과 컴파일된 artifacts가 필요합니다.
DID 통합에는 did 의존성도 필요합니다. 최근 검증에서 인증 설정 2개, 증서 통합 11개, DID 통합 7개가 통과했습니다. 통합 개수에는 상위 테스트가 포함됩니다. 테스트는 프로세스 환경변수로 임시 키·DB를 주입하며 실제 서비스 키나 Sepolia 거래를 사용하지 않습니다.
임시 체인/DB를 사용해 실제 프론트 API의 발급·재시도·재시작 복구·양도·사용 차단을 검증합니다.
실제 Sepolia 검증은 `npm run test:sepolia`이며 테스트 증서를 발급·양도·사용하는 거래와 가스비가 발생합니다.
결과는 `contract/deployments/sepolia-smoke-*.json`에 저장합니다.

## 시연 범위

데모 접속 암호 인증과 DID 연동을 제공합니다. 실제 직원/병원 신원 인증, 실제 헌혈 확인과 검사정보 연동은 미구현입니다.
초대받은 참여자는 공통 운영자 권한으로 시연합니다. 실제 개인정보·메인넷 자산을 사용하는 운영 서비스가 아닙니다.
발급 요청 키는 같은 요청의 거래 중복을 막을 뿐, 다른 키로 같은 헌혈 건을 발급하는 것까지 검증하지 않습니다.
