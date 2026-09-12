# BloodPass — Web3 헌혈증서와 자격 검증 프로토타입

헌혈증서의 발급·양도·사용 이력을 블록체인으로 확인하고, 헌혈자의 가상 자격정보는 별도 전자서명으로 검증하는 사회문제 해결 프로토타입입니다.

## 평가자를 위한 핵심 안내

| 확인할 내용 | 이 프로젝트에서 볼 수 있는 것 |
| --- | --- |
| 해결하려는 문제 | 증서의 소유·사용 상태 확인, 동일 증서의 중복 사용 방지, 후보자 자격정보의 변경 여부 확인 |
| Web3 활용 | ERC-721 소유권·이벤트 이력, 소유자 서명 기반 양도, 발급기관 키로 서명한 자격정보 검증 |
| 구현 범위 | 증서 발급·양도·사용·검증, VC 발급·갱신·취소·매칭, 데모 로그인 |
| 실행 방법 | 아래 로컬 통합 실행으로 프론트·백엔드·DID·로컬 체인을 함께 실행 |
| 검증 근거 | 자동 테스트, [GitHub Actions 설정](.github/workflows/verify.yml), [보안 검토 대응표](docs/security-review.md) |
| 데이터 범위 | 가상 데이터 전용. 메인 화면의 혈액 보유 현황은 목업이며 실제 재고와 연결되지 않음 |

## 왜 Web3인가

- **소유권과 사용 이력:** 증서 소유자와 사용 상태를 컨트랙트에 기록하고, 이벤트로 발급·양도·사용 이력을 확인합니다.
- **소유자 승인:** 양도는 소유자의 EIP-712 서명을 요구합니다. 백엔드 relayer가 거래를 전송하고 가스비를 부담합니다.
- **중복 사용 차단:** 사용된 증서는 다시 사용하거나 양도할 수 없도록 컨트랙트가 제한합니다.
- **정보 분리:** 혈액형·적격 여부·최근 헌혈일은 공개 체인에 올리지 않고 별도 DID 서비스에서 관리합니다.

블록체인은 입력된 헌혈 사실의 진실성을 보장하지 않습니다. VC 서명 역시 데이터 변조 여부를 검증할 뿐 실제 의료 적합성을 판정하지 않습니다. 실서비스에는 신뢰할 수 있는 발급기관과 검사정보 연동이 추가로 필요합니다.

## 구현 구조

| 구성 | 역할 및 저장 데이터 |
| --- | --- |
| [frontend](frontend/README.md) | BloodPass 메인, 증서 발급·조회·검증, 자격·매칭 화면, 지갑 연결 |
| [backend](backend/README.md) | 로그인, API 입력 검증, 거래 릴레이, DID 중계, 증서 부가정보·재시도 상태 SQLite 저장 |
| [contract](contract/README.md) | BloodCertificate: ERC-721 증서 / DonationRegistry: 기록 식별자 해시와 시각 |
| [did](did/README.md) | VC 전자서명·무결성 검증, 갱신·취소·후보자 필터, 별도 SQLite 저장 |

브라우저는 백엔드에 요청하고, 백엔드가 컨트랙트 또는 DID 서비스를 호출합니다. 내부 DID API 키와 서명용 개인키는 프론트에 전달하지 않습니다. NFT 소유권이 이전돼도 원래 헌혈자의 VC는 함께 이전되지 않으며, NFT와 VC 발급은 별도 작업입니다.

## 가장 빠른 로컬 실행

Node.js **24 이상**, npm, Git이 필요합니다. 저장소를 내려받은 뒤 루트에서 실행하세요. 아래 명령은 PowerShell 기준이며 macOS/Linux에서는 `npm.cmd`를 `npm`으로 바꿉니다.

```powershell
git clone https://github.com/onamana/Web3_blooddonation.git
cd Web3_blooddonation
# 제출된 브랜치/커밋을 사용하세요. 이 구성의 작업 브랜치는 frontend입니다.
git switch frontend

npm.cmd --prefix contract ci
npm.cmd --prefix backend ci
npm.cmd --prefix did ci
npm.cmd --prefix frontend ci
npm.cmd --prefix contract run compile
node scripts/demo-local.mjs
```

접속: **http://localhost:5175/certificates**

1. 최초 실행 시 생성되는 `.demo/secrets.json`에서 `accessPassword`를 확인해 로그인합니다.
2. 메인페이지에서 증서 발급·검증, 자격·매칭 화면으로 이동합니다.
3. 자격 발급·검증·검색은 지갑 연결 없이 확인할 수 있습니다. 실제 소유자 서명을 사용하는 양도에는 MetaMask가 필요합니다.
4. 종료는 실행 터미널에서 `Ctrl+C`를 누릅니다.

이 실행기는 로컬 테스트키와 체인을 사용합니다. 개인 RPC 키·Sepolia ETH·수동 `.env` 입력이 필요 없으며 Sepolia 거래를 보내지 않습니다. 최초 의존성·컴파일러 설치에는 인터넷이 필요합니다.

| 항목 | 로컬 통합 실행 | 각 모듈 개별 실행 기본값 |
| --- | --- | --- |
| 프론트 | 5175 | 5173 |
| 백엔드 | 4100 | 4000 |
| DID | 5101 | 5001 |
| 로컬 RPC | 18545 / chain ID 31337 | Sepolia 등 별도 설정 |

로컬 체인은 재시작 시 초기화되지만 SQLite와 생성키는 `.demo/`에 유지됩니다. 로컬 지갑 연결, 데이터 수명, 개별 실행·HTTPS 구성은 [실행 상세 안내](docs/demo-deployment.md)를 참고하세요. 개별 실행의 키·로그인 설정은 `node scripts/setup-did-env.cjs`로 준비할 수 있으며, 이 명령은 컨트랙트를 배포하거나 프론트 환경변수를 설정하지 않습니다.

## 보완한 안정성·보안

- 백엔드는 기본적으로 로그인을 요구합니다. 인증 생략은 명시적인 비운영·loopback 전용 옵션으로 제한합니다.
- VC 핵심 표시정보와 서명 payload를 대조하고 검증된 데이터만 매칭에 사용합니다.
- DID 발급·검증·취소·매칭은 내부 API 키로 보호하고, 운영 환경 전체 VC 목록 조회는 차단합니다.
- 주소·대문자 혈액형·boolean·날짜·기간을 검증하며 빈 본문과 알 수 없는 필드를 거절합니다.
- 매칭의 최소 경과일과 기본값을 백엔드/DID에서 통일했습니다.
- 키 생성은 채워진 값을 보존하고, 알려진 공개 Hardhat 기본 발급키는 테스트 외 사용을 차단합니다.
- 만료·변조·재시작·인증·입력 계약 테스트 및 GitHub 자동 검증을 추가했습니다.
- 컨트랙트 검증은 실행 코드와 메타데이터 차이를 구분합니다. 메타데이터 해시만 다른 경우를 실행 로직 불일치로 오인하지 않습니다.

## 자동 검증

위 의존성 설치 후 루트에서 실행합니다.

```powershell
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
npm.cmd --prefix contract test
node --test contract/scripts/runtime-bytecode.test.js
node --test scripts/setup-did-env.test.cjs
npm.cmd --prefix backend run test:security
npm.cmd --prefix did test
npm.cmd --prefix backend run test:integration
npm.cmd --prefix backend run test:did
node scripts/demo-local.mjs --check
```

최근 로컬 검증 결과: 프론트 빌드·lint 성공, 컨트랙트 20개, DID 30개, 증서 통합 11개, DID 통합 7개, 인증·설정·비교기 회귀 5개 통과. Node 테스트 집계에는 상위 통합 테스트가 포함됩니다. 이 결과는 로컬 Node 22.13에서 확인한 기록이며, 지원 실행 환경과 CI 설정은 Node 24입니다. 테스트 수는 코드 변경에 따라 달라질 수 있습니다.

통합 테스트는 실제 프론트 API 함수·HTTP 서버·임시 로컬 컨트랙트와 DB를 사용합니다. 브라우저·MetaMask를 직접 조작하는 테스트나 실제 병원 연동 검증은 아닙니다. GitHub Actions의 실제 실행 결과는 저장소의 Actions 탭에서 확인해야 하며, 설정 파일만으로 원격 통과를 주장하지 않습니다.

## Sepolia 검증과 한계

Sepolia 배포 기록과 읽기 전용 검사 방법은 [컨트랙트 README](contract/README.md)에 정리했습니다. 로컬 자동 테스트와 실제 테스트넷 거래 검증은 구분합니다.

- 현재는 공통 운영 권한으로 체험하는 프로토타입이며 실제 직원·병원 신원 인증은 없습니다.
- 후보자 검색은 입력된 가상 혈액형·적격 여부·경과일 조건의 필터링입니다. 수혈 적합성이나 환자 배정을 수행하지 않습니다.
- VC는 자체 Ethereum 메시지 서명 방식입니다. 외부 W3C VC/DID 구현과의 상호운용성을 보장하지 않습니다.
- 오프체인 SQLite는 평문 저장입니다. 전자서명은 암호화·익명화가 아니며 실제 개인정보를 입력하지 않습니다.
- 증서 요청 재시도는 동일 키 기준 중복 거래를 방지하지만, 실제 헌혈 건 자체의 중복 등록까지 판별하지 않습니다. VC 재발급은 이전 VC를 무효화합니다.
- 단일 백엔드·DID 인스턴스를 전제로 합니다. DB와 발급키 보존·백업이 필요합니다.
- 외부 배포·실제 브라우저 전체 흐름·다른 PC의 초기 실행 검증은 별도 확인 대상입니다.

## 문서 찾기

- [프론트엔드](frontend/README.md) · [백엔드](backend/README.md) · [컨트랙트](contract/README.md) · [DID/VC](did/README.md)
- [통합 실행·로그인·저장·선택적 HTTPS 배포](docs/demo-deployment.md)
- [환경변수·컨트랙트 연동 상세](docs/contract-integration.md)
- [보안 재검토 대응 및 검증 근거](docs/security-review.md)
