# backend

Node.js 22.13 이상, Express + ethers + SQLite 기반 시연용 API입니다.
현재 데이터 형식과 배포 절차는 [통합 가이드](../docs/contract-integration.md)를 기준으로 합니다.

## 실행

```powershell
npm ci
npm run dev
```

`.env.example`을 참고하되 이미 있는 `.env`를 덮어쓰지 마세요.
`SEPOLIA_RPC_URL`, `BACKEND_SIGNER_PRIVATE_KEY`, 두 컨트랙트 주소, `CERTIFICATE_DEPLOY_BLOCK`이 필요합니다.
`CHAIN_ID=11155111`, `PORT=4000`이 기본입니다.
`BLOOD_CENTER_NAME`은 서버가 정하는 발급기관입니다.

`CERTIFICATE_DB_PATH` 기본값은 `backend/data/certificates.sqlite`입니다.
이 DB는 헌혈 종류·헌혈량, 재시도 키, 서명된 발급 거래를 저장합니다. 혈액형/Rh는 저장하지 않습니다.
DB와 WAL은 백업 대상이며 Git에는 포함하지 않습니다. 백엔드는 하나의 프로세스로 실행합니다.

Swagger: `http://localhost:4000/docs`, 스펙: `/openapi.json`.

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

양도용 POST API는 없습니다. 소유자 지갑이 직접 `safeTransferFrom`을 보낸 후 상세를 재조회합니다.
사용된 증서는 컨트랙트가 양도를 차단합니다. 재사용 요청은 409입니다.

## 별도 기능

- POST /donation/auth: address/message/signature → 무작위 기록 해시와 시각 등록 (혈액형 없음).
- GET /donation/verify/:hash, GET /donation/:hash: 해시 기록 조회.
- POST /match: DID_MODULE_BASE_URL의 /match로 중계. DID 연결과 소비 화면은 이번 증서 통합 범위 밖입니다.

## 테스트

```powershell
npm run test:integration
```

contract/frontend 의존성과 컴파일된 artifacts가 필요합니다.
임시 체인/DB를 사용해 실제 프론트 API의 발급·재시도·재시작 복구·양도·사용 차단을 검증합니다.
실제 Sepolia 검증은 `npm run test:sepolia`이며 테스트 증서를 발급·양도·사용하는 거래와 가스비가 발생합니다.
결과는 `contract/deployments/sepolia-smoke-*.json`에 저장합니다.

## 시연 범위

직원/병원 인증, 실제 헌혈 확인, 검사정보·DID 연결은 미구현입니다.
API 호출자의 인증 없이 서버가 relayer 권한을 사용하므로 공개 운영 서비스로 간주하면 안 됩니다.
발급 요청 키는 같은 요청의 거래 중복을 막을 뿐, 다른 키로 같은 헌혈 건을 발급하는 것까지 검증하지 않습니다.
