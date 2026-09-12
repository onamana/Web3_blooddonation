# frontend

## 현재 통합 기준 (2026-09-10)

로컬 main `2df9770`의 헌혈 종류·헌혈량 발급 화면에 맞춰 백엔드/컨트랙트를 연결했다.
현재 DID 연동·로그인·배포 절차는 [데모 배포 안내](../docs/demo-deployment.md)를 기준으로 한다. `/credentials`에서 VC 발급·검증·취소·후보자 검색을 제공한다.
공개 증서에는 혈액형/Rh가 없으며, 종류·헌혈량은 백엔드 SQLite에서 조회한다.
`/issue`는 발급 화면이다. `VITE_CERTIFICATE_CONTRACT_ADDRESS`에 새 증서 주소를 설정하고
`VITE_CHAIN_ID=0xaa36a7`, `VITE_DEMO_MODE=false`로 실행한다. `/certificates` 시작 화면에서
지갑 연결을 시작한다. 연결에 실패하면 `VITE_DEMO_MODE=true`일 때만 데모 진입 선택지가 표시된다.
양도는 지갑이 직접 전송하며 전송 전에 네트워크를 확인/전환한다.
발급 재시도 키는 sessionStorage에 보관한다. MetaMask 팝업 없이 API/로컬 체인 통합 테스트가 가능하다.
아래 브라우저 리포트는 이전 혈액형 포함 버전의 기록이며 새 버전의 브라우저 검증 결과는 아니다.

BloodPass 프론트엔드. 제출용 MVP인 **헌혈 증서(ERC-721) 4화면**만 남긴 상태다
(루트 README "제출용 MVP 목표" 참고).

- `frontend/sample/*.html` 은 초기 아트보드다. 이 아트보드로 만들었던 헌혈자 앱(`/donor`)·
  병원 매칭 콘솔(`/hospital`) 화면은 2026-09-08에 삭제했고(아래 참고), 아트보드 자체는
  **디자인 참고용으로만** 남겨뒀다. `src/styles/tokens.css` 의 색·간격 토큰이 여기서 나왔고,
  증서 화면 디자인을 다듬을 때 기준으로 쓸 수 있다. 실제 코드는 이 파일을 참조하지 않는다.

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
| `VITE_EXPLORER_BASE_URL` | `https://sepolia.etherscan.io` | 트랜잭션 해시 링크에 쓰는 블록 익스플로러 |

## 라우팅

- `/` → `/certificates` 로 리다이렉트
- `/certificates` — **증서 목록 (지갑)**. 카드 목록 + 양도. 지갑 미연결이면 같은 주소에서
  연결 화면(`WalletGate`)을 대신 보여주고, 우측 상단 "연결 해제"로 되돌아간다.
- `/certificates/:tokenId` — **내 증서 상세**. 해당 카드를 가운데에 놓고 뒷면의 정보와 이력을 연다.
- `/verify` — **증서 검증**. 번호 입력 → 판정 → 사용 처리.
  이미 사용된 증서면 **검증 실패(이중사용 차단)** 화면으로 갈린다.
- 그 외 경로 — 404 안내 화면

## 헌혈 증서 (ERC-721)

- `src/features/certificate/` 에 3개 주요 화면과 공용 조각(`WalletGate`, `HistoryTimeline`,
  `OnchainProof`, `VerifyFailure`)이 모여 있다.
- `src/api/certificate.ts` 가 `DEMO_MODE` 로 갈린다. 데모면 인메모리 스토어
  (`src/data/certificateStore.ts`), 아니면 백엔드 `/certificate` 를 호출한다. **양쪽이 같은 타입을
  돌려주므로 화면 코드에는 분기가 없다.**
- 데모 스토어를 읽기 전용 목업으로 두지 않고 실제로 변형시키는 이유는, 양도/사용이 상태를 바꿔야
  "이미 사용한 증서를 다시 검증하면 막힌다"는 이중사용 차단 데모가 성립하기 때문이다.
  새로고침하면 초기 목업으로 되돌아간다.
- 이력 타임라인은 우리가 만드는 게 아니라 ERC-721이 자동으로 남기는 `Transfer` 이벤트 로그를
  읽어온 것이다. 종이 증서에는 남지 않는 기록이라는 게 이 화면의 요점.
- **디자인 미완성**: 지금은 배치와 흐름만 잡아둔 최소 스타일(`Certificate.module.css`)이다.

## 초기 화면 파티클 효과

`src/components/ParticleFlock.tsx` — 방울 파티클이 모여 "BloodPass" 글자를 만들고, 커서가
다가오면 반경 안의 개체가 밀려나 공동이 파이고, 커서가 지나가면 다시 모여 글자를 복구한다.
(참고: recent.design 의 "404 Chicken Flock Animation")

- 글자를 오프스크린 캔버스에 한 번 그려 불투명 픽셀을 샘플링해 목표 좌표를 얻고, 파티클을
  스프링으로 그 좌표에 당긴다. 커서 반경 안에서는 반발력을 더한다. 라이브러리는 쓰지 않는다.
- 파티클 수는 `MAX_PARTICLES` 상한에 맞춰 샘플링 간격을 자동 조절한다. **이 값이 낮으면 글자가
  희박해서 안 읽힌다** (처음 900으로 뒀다가 글자가 구름처럼 보여서 1800으로 올렸다).
- `prefers-reduced-motion` 을 JS에서 직접 확인한다. `global.css` 의 전역 처리는 CSS 전환만
  끄고 `requestAnimationFrame` 은 막지 못하므로, 이 컴포넌트는 애니메이션을 아예 시작하지 않고
  완성된 글자만 한 번 그린다.
- `build()` 끝에서 항상 한 번 그린다. 백그라운드 탭에서는 브라우저가 rAF를 멈추기 때문에
  이게 없으면 캔버스가 빈 채로 남는다.
- 접근성: 글자가 캔버스라서 `role="img"` + `aria-label` 로 서비스명이 읽히게 했다.

## 데모 모드 vs 실제 API 모드

`VITE_DEMO_MODE=true`(기본값)일 때:

- 증서 데이터는 `src/data/certificateMock.ts` 를 초기값으로 하는 인메모리 스토어를 쓴다.
- 지갑 연결은 실제 MetaMask(`window.ethereum`)로도 가능하지만, MetaMask가 없는 환경에서도
  체험할 수 있도록 "MetaMask 없이 데모로 체험하기" 버튼으로 가상 지갑 연결을 제공한다.
- 화면 하단에 데모 모드임을 알리는 문구가 항상 노출된다.
- **주의**: 이 모드의 트랜잭션 해시는 실재하지 않는 가짜다. Etherscan 링크를 누르면 조회가
  안 된다. 실제 컨트랙트 배포 전까지 남아 있는 문제다.

`VITE_DEMO_MODE=false`로 바꾸면:

- 지갑 연결은 오직 실제 `window.ethereum`(MetaMask)만 사용한다.
- 조회/발급/사용은 백엔드 `/certificate`를 거치고, 양도는 소유자 지갑에서 직접 전송한다.

- 로딩 중 / 결과 없음 / 연결 실패 / 501(외부 모듈 미연결) 상태를 각각 구분해서 보여주며,
  API 에러를 목업 성공 데이터로 대체하지 않는다.

## 지갑 연결 (MetaMask)

- `eth_requestAccounts` 로 계정 연결을 요청한다.
- `accountsChanged`, `disconnect` 이벤트를 구독해 계정 변경/연결 해제를 반영한다.
- `window.ethereum` 이 없으면 "MetaMask가 설치되어 있지 않습니다" 안내와 설치 링크를 보여준다.
- 화면에는 항상 축약된 주소(`0x1234…abcd`)만 노출한다 (`src/utils/address.ts`).
- **연결 상태는 앱 최상단에서 한 번만 만들어 컨텍스트로 내려준다** (`src/hooks/WalletProvider.tsx`,
  `src/hooks/walletContext.ts`). 화면 컴포넌트가 각자 `useWalletMachine()` 을 부르면 라우트를
  옮길 때마다 연결이 풀린다(목록 → 상세 → 목록에서 연결 화면이 다시 뜨는 문제).

## 결정된 사항

- **혈액형 분리 (2026-09-10)**: 증서와 헌혈 기록 API/컨트랙트에서 혈액형을 제거했다.
  main의 `demoBloodProfileStore`는 가상 검사정보 전용이며 실제 검사정보 DB 연결은 아직 별도 작업이다.
- **미구현(외부 모듈 미연결) 처리 컨벤션 (2026-09-07)**: 컨트랙트 주소 미설정 시 백엔드는
  `501` + `{ error, detail? }` 로 응답하고, 프론트는 이를 `ApiError.notImplemented` 로 동일하게
  "아직 외부 모듈이 연결되지 않았습니다"로 안내한다.
- **헌혈자 앱 / 병원 매칭 콘솔 화면 삭제 (2026-09-08)**: 증서 흐름과 무관해서 제거했다.
  삭제 대상은 `features/donor/`, `features/hospital/`, `data/donorMock.ts`,
  `data/hospitalMock.ts`, `types/donor.ts`, `types/hospital.ts`, `api/donation.ts`,
  `api/match.ts`, 그리고 이들만 쓰던 공용 컴포넌트(`Modal`, `BottomSheet`, `Toast`)와
  `hooks/useDialogBehavior.ts`. 증서 화면이 쓰던 `WalletGate` 는
  `features/certificate/` 로 옮겨 증서 문구로 다시 썼고, `shortenAddress` 는
  `utils/address.ts` 로 옮겼다. 되살릴 일이 생기면 커밋 `108ec4b` 에 원본이 있다.
  - 이 삭제로 지갑 상태의 `donorId`(DID API가 없어서 주소에서 파생시킨 데모 전용 ID)도 함께
    제거됐다. 화면에 쓰는 곳이 없어졌기 때문이다.

## 브라우저 실사용 검증 리포트 (2026-09-10)

`contract` 브랜치 코드리뷰(양도 구조를 relayer → 프론트 지갑 직접 호출로 변경) 대응 후,
실제 Chrome + MetaMask + Sepolia로 `/certificates` 화면을 끝까지 테스트했다.

**결과**: 지갑 연결 → 실제 보유 증서 목록(온체인 데이터) 표시 → "양도하기" → MetaMask
`safeTransferFrom` 서명 → 실제 tx(`0xca536f...3a94`) 반영 → 새로고침 후 목록에서 정상적으로
제외까지 전부 성공. 리뷰가 지적했던 relayer 양도 구조 문제가 실제로 해결됐음을 확인했다.

### 테스트 중 겪은 이슈

1. **MetaMask가 Sepolia가 아니라 Ethereum 메인넷에 맞춰져 있어 첫 시도 실패.**
   `transferCertificate()`가 `eth_sendTransaction`을 보낼 때 체인을 지정하지 않고 MetaMask가
   **현재 선택된 네트워크**를 그대로 쓰기 때문에, 지갑이 메인넷에 가 있으면 (메인넷 기준
   가스비를 낼 ETH가 없어) "네트워크 수수료" 에러로 막힌다. 수동으로 Sepolia로 전환한 뒤 해결.
   → **발견된 개선 여지 (아직 미수정)**: 트랜잭션을 보내기 전에 `eth_chainId`로 현재 네트워크를
   확인하고, Sepolia(`0xaa36a7`)가 아니면 `wallet_switchEthereumChain`으로 전환을 요청하거나
   최소한 명확한 안내 문구를 보여주는 편이 안전하다. 지금은 MetaMask의 원인 불명확한
   "네트워크 수수료" 에러를 그대로 사용자가 마주친다.
2. **네트워크 전환 직후 이전 요청이 큐에 남아 재현이 헷갈렸다.** MetaMask는 origin당 보류 중인
   `wallet_requestPermissions` 요청을 하나만 허용하는데, 팝업이 사용자 화면에 포커스되지 않고
   떠 있어서 "아무 반응이 없다"처럼 보였다. MetaMask 확장 아이콘을 직접 클릭해 큐에 쌓인 요청을
   찾아 처리하니 풀렸다. 코드 문제는 아니고 자동화 테스트 환경 특유의 문제였다.
3. **지갑 연결이 새로고침 시 유지되지 않는다.** `useWalletMachine`이 `connect()`에서만
   `eth_requestAccounts`를 부르고, 마운트 시 이미 승인된 계정이 있는지(`eth_accounts`)는 확인하지
   않는다. 그래서 페이지를 새로고침할 때마다 다시 "지갑 연결하기"부터 눌러야 한다.
   → **발견된 개선 여지 (아직 미수정)**: 앱 마운트 시 `eth_accounts`(권한 요청 팝업 없이 이미
   연결된 계정만 조용히 확인하는 메서드)를 먼저 호출해 있으면 자동으로 `connected` 상태로
   복원하면 된다.

이 세 가지 중 1·3번은 코드 변경이 필요한 실제 개선 항목이고, 머지를 막는 버그는 아니라서
수정하지 않고 다음 작업으로 남겨둔다.

## 폴더 구조

```
src/
  api/        # fetch 래퍼(client), zod 응답 스키마, 증서 API
  components/ # 공용 UI (Badge, DemoModeBanner, 아이콘)
  data/       # 데모 증서 목업 + 인메모리 스토어, 데모 지갑 주소
  features/
    certificate/  # 증서 4화면 + 공용 조각
  hooks/      # 지갑 연결 상태 머신 + 컨텍스트
  pages/      # 404 등 라우트 전용 페이지
  styles/     # 디자인 토큰(CSS 변수), 전역 스타일
  types/      # 도메인 타입 (증서 타입은 api/schemas.ts 에서 파생)
  utils/      # 주소 축약, 온체인 값 포맷/익스플로러 링크
```
