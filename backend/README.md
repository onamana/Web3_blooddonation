# backend

## 세팅

```bash
cd backend
npm install
cp .env.example .env   # 값 채워넣기
npm run dev
```

- `SEPOLIA_RPC_URL`, `BACKEND_SIGNER_PRIVATE_KEY`: ethers.js 연습(②) 전에 필요
- `DONATION_CONTRACT_ADDRESS`: A가 배포 후 전달해주는 주소로 교체
- `CERTIFICATE_CONTRACT_ADDRESS`: 증서(ERC-721) 컨트랙트 주소. 미설정 시 `/certificate` 는 501
- `CERTIFICATE_DEPLOY_BLOCK`: BloodCertificate가 배포된 블록 번호(`deploy.js` 출력 참고). 비워두면
  이력 조회(`queryFilter`)가 블록 0부터 훑는데, 일부 RPC(Infura 등)는 `eth_getLogs` 블록 범위를
  제한해서 "range exceeds limit" 에러로 `/certificate` 관련 라우트가 전부 깨진다.
- `DID_MODULE_BASE_URL`: B가 만든 DID 모듈 API 주소로 교체

서버 켜면 `http://localhost:4000/docs`에서 Swagger UI로 API 확인 및 테스트 가능 (`/openapi.json`은 원본 스펙).

## 구조

- `src/server.js` — Express 진입점, Swagger UI 마운트
- `src/config/chain.js` — provider/signer/contract 인스턴스 (ethers.js)
- `src/routes/donation.js` — 헌혈 인증 요청 처리 (서명 검증 → 온체인 record/verify/query)
- `src/routes/certificate.js` — 헌혈 증서(ERC-721) 조회/사용 처리 (양도는 프론트 지갑이 직접 온체인으로 보낸다)
- `src/routes/match.js` — 병원 매칭 조건을 B(DID 모듈)로 중계
- `src/utils/verifySignature.js` — MetaMask 서명 검증 (프론트에서 서명한 메시지 확인용)
- `src/schemas/*.js` — Zod 스키마 (요청 검증 + Swagger 문서 생성의 단일 원천)
- `src/middleware/validate.js` — Zod 스키마로 body/params 검증하는 미들웨어
- `src/openapi/document.js` — 스키마들을 모아 OpenAPI 문서로 조립
- `contracts/DonationRegistry.sample.abi.json` — A의 실제 ABI 나오기 전까지 쓰는 더미 ABI
- `contracts/BloodCertificate.sample.abi.json` — 증서(ERC-721)용 더미 ABI (Transfer/CertificateUsed 이벤트 포함)
- `scripts/ethersPlayground.js` — ethers.js 연습용 스크립트 (`npm run ethers:playground`)

## 새 라우트 추가할 때 순서

1. `src/schemas/`에 Zod 스키마 정의 (요청 body/params, 필요하면 응답 모양도)
2. 라우트에 `validateBody(schema)` / `validateParams(schema)` 미들웨어로 연결
3. `src/openapi/document.js`에 `registry.registerPath({...})`로 등록
4. 이걸로 끝 — 검증 로직과 `/api-docs` 문서가 같은 스키마에서 자동으로 나옴 (따로 손댈 곳 없음)

## API (초안, D/B와 합의 필요)

- `GET /health`
- `POST /donation/auth` — body: `{ address, message, signature, bloodType }`
- `GET /donation/verify/:hash`
- `GET /donation/:hash`
- `GET /certificate?owner=0x...` — 지갑이 보유한 증서 목록
- `GET /certificate/:tokenId` — 증서 상세 + 이력 타임라인
- `GET /certificate/:tokenId/verify` — 병원 검증 (`valid` / `used` / `notfound`)
- `POST /certificate/:tokenId/use` — body: `{ hospital }`
- `POST /match` — body: 매칭 조건 (혈액형, 최근 헌혈일 등) → B로 중계

## 증서(ERC-721) 라우트 설계 메모

- **이력을 우리가 저장하지 않는다.** ERC-721은 전송마다 `Transfer` 이벤트를 자동으로 남기므로
  `queryFilter` 로 로그를 읽어 타임라인을 재구성한다. 발급은 `from`이 zero address인 Transfer다.
  사용 처리만 컨트랙트의 `CertificateUsed` 이벤트를 추가로 합친다.
- **목록 조회**는 `Transfer` 의 indexed `to` 로 후보를 좁힌 뒤 `ownerOf` 로 현재 소유자만 남긴다.
  별도 인덱서 없이 RPC만으로 가능한 범위라서, `/donation` 쪽의 "목록 API를 만들지 않는다"는
  결정과는 상황이 다르다 (루트 README 참고).
- **이중사용 차단**은 `POST /certificate/:tokenId/use` 가 `isUsed` 를 먼저 확인하고 409로 막는다.
  프론트의 "검증 실패" 화면이 이 판정을 그대로 보여준다.
- **양도는 백엔드가 중계하지 않는다.** relayer가 ERC-721 `transferFrom`을 보내려면 소유자가 먼저
  `approve()`를 해야 하는데 그 단계가 없으면 항상 `ERC721InsufficientApproval`로 revert된다.
  대신 소유자의 MetaMask가 컨트랙트의 `safeTransferFrom()`을 직접 호출하고
  (`frontend/src/api/certificate.ts`), 백엔드는 그 뒤 `GET /certificate/:tokenId`로 최신 소유자/
  이력만 다시 읽어온다. 사용 완료된 증서의 양도 차단도 `BloodCertificate.sol`의 `_update()`
  override가 온체인에서 강제하므로 백엔드가 따로 막을 필요가 없다.

## D(프론트엔드)와 결정된 사항

- **혈액형 매핑 (A·C 협의, 2026-09-07)**: API는 `bloodType`을 `"A"|"B"|"AB"|"O"` 문자열로만
  주고받는다. 컨트랙트가 요구하는 `uint8` 변환은 `src/utils/bloodTypeMap.js`(`A=0, B=1, AB=2, O=3`)에서
  이 서버 안에서만 처리하고, `POST /donation/auth`에서 record 호출 전 변환, `GET /donation/:hash`에서
  query 결과를 문자열로 역변환해서 응답한다.
- **지갑주소 → 헌혈 이력 전체 목록 API는 만들지 않음 (2026-09-07)**: 온체인 인덱싱 없이는 비효율적이라
  프론트가 목업 데이터로 대체하기로 했다. 해시 단위 조회(`/donation/verify/:hash`, `/donation/:hash`)만
  유지한다.
- **미구현 상태 응답 컨벤션 (2026-09-07)**: 외부 모듈(`DONATION_CONTRACT_ADDRESS`,
  `DID_MODULE_BASE_URL`) 미설정 시 `501` + `{ error, detail? }` 로 통일해서 응답한다. 새 라우트도
  동일하게 맞출 것.
