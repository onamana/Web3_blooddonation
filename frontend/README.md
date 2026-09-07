# frontend

BloodTrace 프론트엔드. `frontend/sample/*.html` 아트보드의 디자인/문구/인터랙션을 기준으로
React + TypeScript + Vite로 재구현한 실제 서비스 화면이다.

- `frontend/sample/` 의 원본 HTML은 참고용 아트보드로 그대로 유지되며, 실제 코드에서 참조하지 않는다.

## 세팅

```bash
cd frontend
npm install
cp .env.example .env   # 필요 시 값 수정
npm run dev
```

- `npm run dev` — 개발 서버 (기본 http://localhost:5173)
- `npm run typecheck` — TypeScript strict 모드 타입 검사 (`tsc -b --noEmit`)
- `npm run lint` — ESLint
- `npm run build` — 타입 체크 + 프로덕션 빌드 (`dist/`)
- `npm run preview` — 빌드 결과 미리보기

## 환경변수 (`.env`, `.env.example` 참고)

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:4000` | 백엔드(`backend/`) API 기본 주소 |
| `VITE_DEMO_MODE` | `true` | `true`면 아래 "데모 모드" 참고. `false`로 바꾸면 실제 백엔드 API를 호출한다. |

## 라우팅

- `/` → `/donor` 로 리다이렉트
- `/donor` — 헌혈자용 모바일 앱 (390×844 기준 모바일 퍼스트, 데스크톱에서는 중앙 정렬된 폭 제한 카드)
- `/hospital` — 병원용 매칭 콘솔 (1440×900 기준, 태블릿 폭까지 반응형)
- 그 외 경로 — 404 안내 화면

## 데모 모드 vs 실제 API 모드

`VITE_DEMO_MODE=true`(기본값)일 때:

- 헌혈자 화면의 요약/이력/혈액 여정, 병원 화면의 AI 인사이트/매칭 결과는 모두
  `src/data/donorMock.ts`, `src/data/hospitalMock.ts` 의 목업 데이터를 사용한다
  (`frontend/sample/*.html`의 데모 데이터를 그대로 옮긴 것).
- 지갑 연결은 실제 MetaMask(`window.ethereum`)로도 가능하지만, MetaMask가 없는 환경에서도
  체험할 수 있도록 "MetaMask 없이 데모로 체험하기" 버튼으로 가상 지갑 연결을 제공한다.
- 화면 하단에 데모 모드임을 알리는 문구가 항상 노출된다.

`VITE_DEMO_MODE=false`로 바꾸면:

- 지갑 연결은 오직 실제 `window.ethereum`(MetaMask)만 사용한다.
- 헌혈자 화면은 목업 이력 목록 대신 "헌혈 기록 조회" 패널로 바뀌어, 발급받은 헌혈 해시를 입력하면
  실제 `GET /donation/:hash`, `GET /donation/verify/:hash` 를 호출한다.
- 병원 화면은 "매칭 결과 (실제 API)" 패널로 바뀌어 실제 `POST /match` 를 호출하고,
  응답을 원시 JSON으로 표시한다 (아래 "미완성 기능" 참고).
- 로딩 중 / 결과 없음 / 연결 실패 / 501(외부 모듈 미연결) 상태를 각각 구분해서 보여주며,
  API 에러를 목업 성공 데이터로 대체하지 않는다.

## 지갑 연결 (MetaMask)

- `eth_requestAccounts` 로 계정 연결을 요청한다.
- `accountsChanged`, `disconnect` 이벤트를 구독해 계정 변경/연결 해제를 반영한다.
- `window.ethereum` 이 없으면 "MetaMask가 설치되어 있지 않습니다" 안내와 설치 링크를 보여준다.
- 화면에는 항상 축약된 주소(`0x1234…abcd`)만 노출하고, 전체 주소는 컴포넌트 상태에만 보관한다.
- **donor ID는 실제 DID API가 아직 없어서** 지갑 주소로부터 안정적으로 파생시킨 데모 전용 ID이다
  (`src/utils/donorId.ts`의 `deriveDemoDonorId`). 값 뒤에 `(DEMO)` 표시가 붙어 실제 DID/VC 식별자가
  아님을 명확히 구분한다.

## 발견 사항 — 혈액형 타입 계약 불일치

`backend/src/routes/donation.js` 의 `POST /donation/auth` 는 `bloodType` 을
`"A" | "B" | "AB" | "O"` 문자열로 받아 그대로 스마트컨트랙트 `record()` 에 넘긴다
(`backend/src/schemas/common.js` 의 `bloodTypeSchema`).

반면 `backend/contracts/DonationRegistry.sample.abi.json` 의 더미 ABI를 보면 컨트랙트의
`bloodType` 파라미터는 `uint8` 이다. 즉 문자열 → uint8 매핑 규칙(예: A=0, B=1, AB=2, O=3 같은 합의)이
A(스마트컨트랙트)·C(백엔드) 담당자 간에 아직 정해지지 않았다.

프론트엔드는 이 매핑을 임의로 추측하지 않고, `src/api/donation.ts` 의 `postDonationAuth` 에서
백엔드가 요구하는 문자열 그대로 전달한다. 실제 컨트랙트가 배포되고 매핑 규칙이 합의되면
백엔드(`donation.js`)에서 변환하거나, 프론트에 별도 매핑 테이블을 추가해야 한다.

## 아직 지원하지 않는 기능 (백엔드/외부 모듈 미완성)

- **지갑 주소 → 헌혈 이력 전체 목록** 조회 API가 없다. 실제 API 모드의 헌혈자 화면은 해시 단위
  조회(`RealDonationLookup.tsx`)로만 동작하며, 목업 모드의 "헌혈 이력" 카드 목록과 동일한 기능을
  제공하지 못한다.
- **`POST /match` 의 실제 응답 스펙(B/DID 모듈)이 미확정**이라 병원 화면의 매칭 결과 카드(거리/성분/
  유닛/매칭 점수 등)로 자동 매핑하지 못한다. 실제 API 모드에서는 원시 JSON만 보여준다
  (`src/features/hospital/RealMatchPanel.tsx`, `src/api/match.ts` 의 TODO 참고).
- `DONATION_CONTRACT_ADDRESS`, `DID_MODULE_BASE_URL` 이 백엔드에 설정되지 않은 동안에는
  두 엔드포인트 모두 501을 반환하며, 프론트는 이를 "아직 외부 모듈이 연결되지 않았습니다"로 안내한다.

## 폴더 구조

```
src/
  api/        # fetch 래퍼, zod 응답 스키마, 엔드포인트별 함수
  components/ # 공용 UI (Badge, Modal, BottomSheet, Toast, 아이콘)
  data/       # 데모 목업 데이터 (샘플 아트보드 데이터를 타입화)
  features/
    donor/    # 헌혈자 앱 화면들
    hospital/ # 병원 콘솔 화면들
  hooks/      # useWallet, useDialogBehavior 등
  pages/      # 404 등 라우트 전용 페이지
  styles/     # 디자인 토큰(CSS 변수), 전역 스타일
  types/      # 도메인 타입
  utils/      # donorId 파생 등 순수 유틸
```
