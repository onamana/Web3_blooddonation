# BloodPass contract

Hardhat 2 · Solidity 0.8.24 · OpenZeppelin ERC-721/AccessControl 기반입니다. 전체 실행은 [통합 README](../README.md)를 참고하세요.

## 역할과 권한

| 컨트랙트 | 주요 기능 | 권한 |
| --- | --- | --- |
| BloodCertificate | 발급·소유권·사용 상태·이벤트 이력 | 발급/사용은 ISSUER_ROLE |
| BloodCertificate | 소유자 EIP-712 서명에 의한 릴레이 양도 | 서명·소유권·기한·재사용 여부 검증 |
| DonationRegistry | 기록 해시·시각 등록 및 조회 | 등록은 RECORDER_ROLE |

앱의 양도는 백엔드가 `transferWithAuthorization` 거래를 전송합니다. ERC-721 직접 전송 기능도 있지만, 이를 현재 프론트의 기본 양도 흐름과 혼동하지 않습니다. 사용된 증서는 릴레이 및 직접 양도 모두 차단됩니다.

두 컨트랙트는 혈액형/Rh를 저장하지 않습니다. 헌혈 종류·헌혈량은 백엔드 SQLite, 자격정보는 DID SQLite에 분리됩니다. 관리자/relayer 권한은 HTTP 사용자의 신원을 인증하는 기능이 아닙니다.

## 컴파일과 검증

Node 24 기준, 이 폴더에서 실행합니다.

```powershell
npm.cmd ci
npm.cmd run compile
npm.cmd test
node --test scripts/runtime-bytecode.test.js
```

컨트랙트 20개 테스트는 발급·역할 거절·중복 기록·재사용 차단·소유권·양도 서명 재사용/변조 차단 등을 검사합니다. 비교기 회귀 테스트는 메타데이터 차이, 실제 실행 코드 변경, 잘못된 형식, 빈 배포 코드를 구분합니다.

ABI를 변경한 경우 `npm.cmd run sync:abi`로 backend/contracts의 ABI를 갱신하고 백엔드 통합 테스트를 실행합니다. 이 명령은 파일을 변경하므로 diff를 확인하세요.

## 실행 코드와 메타데이터 비교 보완

`npm.cmd run check:deployment`는 설정된 RPC에서 코드를 읽고 프론트/백엔드 증서 주소, 실행 코드, 백엔드 역할과 잔액을 확인합니다. 거래를 전송하지 않습니다.

| 결과 필드 | 의미 |
| --- | --- |
| executableMatches | 생성자 고정값을 보정하고 인식 가능한 메타데이터를 분리한 실행 코드 일치 |
| metadataMatches | 컴파일 산출물에 붙은 메타데이터 일치 |
| fullBytecodeMatches | 생성자 고정값 보정 후 전체 바이트코드 일치 |
| roleGranted | 해당 컨트랙트의 백엔드 역할 보유 |
| frontendConfigured | 프론트의 실제 API 모드 여부, 결과 최상위에 표시 |

기존 검사는 메타데이터 해시만 달라도 실패했습니다. 보완 후에는 알려진 Solidity IPFS/버전 trailer만 구분하며, 알 수 없거나 잘못된 형식은 임의로 제거하지 않습니다. 실행 코드 차이는 계속 실패 처리합니다.

이 비교는 코드·일부 설정 검사이며, 모든 저장 상태·과거 거래·브라우저 흐름의 정확성을 보증하지 않습니다. Etherscan 소스 검증과도 별도입니다.

## 저장소의 Sepolia 배포 기록

현재 검토에 사용한 [manifest](deployments/sepolia-1789102445429.json):

| 항목 | 값 |
| --- | --- |
| BloodCertificate | `0x7f8455f7E08CF4199a37AD65902549924Fb3c005` |
| DonationRegistry | `0x50aD2898A39B3E24B5DB989f609cd0063022290F` |
| 증서 배포 블록 | `11679714` |

최근 읽기 전용 검사에서는 두 실행 코드와 백엔드 역할이 일치했고, BloodCertificate의 메타데이터만 달랐습니다. 이는 검사 당시 기록이며 현재 네트워크 상태는 다시 확인해야 합니다. 이전 manifest·smoke 거래 파일은 과거 배포의 기록으로, 다른 주소의 최신 검증 증거로 취급하지 않습니다.

## 선택: Sepolia 배포

로컬 통합 실행에는 이 단계가 필요하지 않습니다. 개별 설정은 `.env.example`을 참고하고 백엔드의 signer·RPC와 일치시키세요.

```powershell
npm.cmd run preflight:sepolia
npm.cmd run deploy:sepolia
```

preflight는 RPC 체인·지갑 일치·예산을 검사합니다. deploy는 테스트 ETH를 소비하며 새 컨트랙트를 생성하고 역할을 부여합니다. 진행 기록은 `deployments/`에 저장됩니다. 기존 증서는 자동 이전되지 않습니다.

기존 환경파일이 전혀 없는 경우의 `setup:demo`는 새 Sepolia 테스트 지갑을 만드는 보조 도구이며, DID·로그인까지 준비하는 로컬 통합 실행기와 다릅니다.

Etherscan API 키가 있으면 `npm.cmd run verify:sepolia -- <주소> <배포지갑주소>`로 소스 검증을 별도 수행합니다.

추가 안내: [연동 상세](../docs/contract-integration.md) · [통합 실행](../docs/demo-deployment.md).
