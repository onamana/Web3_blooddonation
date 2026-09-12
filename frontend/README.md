# BloodPass frontend

React·TypeScript·Vite 기반 화면입니다. 전체 프로젝트 목적과 가장 빠른 실행은 [통합 README](../README.md)를 참고하세요.

## 화면과 역할

| 경로 | 내용 |
| --- | --- |
| `/` | `/certificates`로 이동 |
| `/certificates` | BloodPass 메인·혈액 보유 현황·지갑 연결 및 증서 목록 |
| `/certificates/:tokenId` | 증서 상세와 온체인 이력 |
| `/issue` | 헌혈 종류·헌혈량에 따른 증서 발급 |
| `/verify` | 증서 조회·검증·사용 처리 |
| `/credentials` | 가상 자격 VC 발급·갱신·검색·검증·취소 |
| `/learn` | 학습 콘텐츠 |

혈액 보유 현황은 `src/data/bloodSupplyMock.ts`의 데모 데이터이며 실제 재고 API에 연결되지 않습니다. 자격 적격 여부도 사용자가 입력하는 가상 판정값입니다.

현재 `DemoAccess`는 전체 라우트를 감쌉니다. 실제 API 모드에서 로그인 설정이 활성화되어 있으면 메인페이지도 로그인 후 표시됩니다. 로그인 화면만 뜨는 것과 메인 화면 오류를 구분하세요.

## 실행

Node 24 이상을 기준으로 합니다. 통합 실행은 루트의 `node scripts/demo-local.mjs`를 사용합니다. 개별 실행은 이 폴더에서 다음과 같습니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

기본 주소는 http://localhost:5173/certificates 입니다. 설정이 없을 때는 `.env.example`을 참고해 `.env`를 생성하고, 기존 파일은 덮어쓰지 마세요.

| 환경변수 | 용도 |
| --- | --- |
| `VITE_API_BASE_URL` | 개별 실행 기본 `http://localhost:4000` |
| `VITE_DEMO_MODE` | `false`는 실제 백엔드 연결, `true`는 증서 목업 체험 |
| `VITE_CHAIN_ID` | Sepolia `0xaa36a7`, 로컬 체인 `0x7a69` |
| `VITE_CERTIFICATE_CONTRACT_ADDRESS` | 백엔드와 동일한 증서 컨트랙트 주소 |
| `VITE_EXPLORER_BASE_URL` | Sepolia 익스플로러 링크의 기준 주소 |

`VITE_` 값은 브라우저에 공개됩니다. 개인키·내부 API 키·접속 암호를 넣지 않습니다. 브라우저 접속은 `localhost`로 통일하세요. `.env` 변경 후에는 개발 서버를 재시작해야 하며 강력 새로고침만으로 서버 설정이 갱신되지 않습니다.

## 실제 연동과 목업의 구분

- 실제 증서 양도는 소유자가 EIP-712 메시지에 서명하고 백엔드가 `transferWithAuthorization` 거래를 전송합니다. 소유자가 직접 가스비를 내는 흐름이 아닙니다.
- 증서 발급 재시도 키는 sessionStorage에 보관하며 백엔드의 중복 거래 방지 기능과 연결됩니다.
- 증서 목업은 인메모리 스토어로 동작하고 새로고침 시 초기화됩니다. 목업 해시는 실제 온체인 거래 증빙이 아닙니다.
- 런타임 데모 체험 선택도 증서 목업으로 전환할 수 있습니다. 실제 체인 검증에는 해당 모드를 해제하고 실제 지갑을 사용합니다.
- `/credentials`는 백엔드·DID API를 호출합니다. 증서 목업 모드를 켠다고 DID 서버까지 목업으로 대체되는 것은 아닙니다.
- NFT와 VC는 별도 발급이며, 증서 양도 시 원래 헌혈자의 자격정보는 이전되지 않습니다.

## 반영된 보완 사항

- 로그인 쿠키와 `X-Demo-Request` 헤더를 API 요청에 포함합니다. 인증 만료는 로그인 화면으로 안내합니다.
- 내부 DID 키는 프론트가 아닌 백엔드가 관리합니다.
- 입력 오류·서버 연결 실패를 성공 목업 데이터로 대체하지 않습니다.
- VC JSON 편집 후 검증 결과 초기화, 갱신·취소 후 후보자 결과 초기화, 취소 확인 체크를 제공합니다.
- 최근 보완 작업은 서버 인증·입력 계약·오류 응답과 자동 테스트에 집중했습니다. 모든 브라우저 동작이 새로 검증됐다는 의미는 아닙니다.

## 검증

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint
# 루트에서: 실제 프론트 API 함수 → HTTP 백엔드 → 로컬 컨트랙트
cd ..
npm.cmd --prefix backend run test:integration
```

마지막 명령은 루트에서 실행하며 contract/backend/frontend 의존성과 컴파일 산출물이 필요합니다. 브라우저·MetaMask 클릭 검증과는 별도입니다. 과거 버전의 직접 전송 방식 브라우저 기록을 현재 릴레이 방식의 검증 결과로 사용하지 않습니다.

## 코드 위치

- `src/api/`: API 호출·응답 스키마·실연동/목업 전환
- `src/features/certificate/`: 증서 화면과 메인 진입
- `src/features/credentials/`: 로그인과 자격·매칭 화면
- `src/hooks/`: 공통 지갑 상태
- `src/data/`: 증서·혈액 보유 현황 등 데모 데이터
- `sample/`: 초기 디자인 참고 자료, 실행 데이터가 아님
- `licenses/`: 사용 UI 자료의 라이선스

검증 범위와 남은 제한: [보안 대응표](../docs/security-review.md).
