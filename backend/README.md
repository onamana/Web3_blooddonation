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
- `DID_MODULE_BASE_URL`: B가 만든 DID 모듈 API 주소로 교체

서버 켜면 `http://localhost:4000/docs`에서 Swagger UI로 API 확인 및 테스트 가능 (`/openapi.json`은 원본 스펙).

## 구조

- `src/server.js` — Express 진입점, Swagger UI 마운트
- `src/config/chain.js` — provider/signer/contract 인스턴스 (ethers.js)
- `src/routes/donation.js` — 헌혈 인증 요청 처리 (서명 검증 → 온체인 record/verify/query)
- `src/routes/match.js` — 병원 매칭 조건을 B(DID 모듈)로 중계
- `src/utils/verifySignature.js` — MetaMask 서명 검증 (프론트에서 서명한 메시지 확인용)
- `src/schemas/*.js` — Zod 스키마 (요청 검증 + Swagger 문서 생성의 단일 원천)
- `src/middleware/validate.js` — Zod 스키마로 body/params 검증하는 미들웨어
- `src/openapi/document.js` — 스키마들을 모아 OpenAPI 문서로 조립
- `contracts/DonationRegistry.sample.abi.json` — A의 실제 ABI 나오기 전까지 쓰는 더미 ABI
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
- `POST /match` — body: 매칭 조건 (혈액형, 최근 헌혈일 등) → B로 중계
