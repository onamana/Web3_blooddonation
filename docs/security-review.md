# DID 보완 및 재검토 근거

가상 데이터 기반 공모전 프로토타입의 검증 범위다. 실제 의료 판정·병원 계정 인증·외부 DID 표준 상호운용성을 구현했다는 의미가 아니다.

| 검토 항목 | 구현 및 자동 검사 |
| --- | --- |
| 외부 클레임과 서명 일치 | `did/src/services/vcService.js`, `did/test/vcService.test.js`, `did/test/security.test.js` |
| 검증된 데이터만 매칭 | `verifiedData` 사용, 변조·만료·경계일 테스트 |
| 키 누락·잘못된 형식·공개 기본키 | `did/test/startup.test.js` |
| 키 보존·공유키 일치·생성 재실행 | `scripts/setup-did-env.test.cjs` |
| 기본 인증 및 로컬 우회 제한 | `backend/src/config/access.js`, `backend/test/access.test.js` |
| 인증 없는 발급·취소·조회 차단 | `backend/test/did-integration.test.js` |
| 양쪽 입력 계약 및 기본값 | 같은 통합 테스트에서 직접 DID와 백엔드에 같은 요청을 보내 비교 |
| 만료·취소·갱신 영속성 | DID SQLite 및 재시작 통합 테스트 |
| 개인정보 | 평문 SQLite, 인증된 후보자 조회, 운영 전체 VC 목록 차단 |

## 실행

Node 24에서 각 폴더의 `npm ci` 후 실행한다. 개인 RPC·실제 발급키 없이 검사할 수 있다.

```powershell
npm.cmd --prefix contract test
node --test contract/scripts/runtime-bytecode.test.js
node --test scripts/setup-did-env.test.cjs
npm.cmd --prefix backend run test:security
npm.cmd --prefix did test
npm.cmd --prefix backend run test:integration
npm.cmd --prefix backend run test:did
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
node scripts/demo-local.mjs --check
```

GitHub Actions는 Node 24에서 동일 검사를 실행한다. 컨트랙트 컴파일 후 통합 테스트를 수행하며 Sepolia 거래는 전송하지 않는다. GitHub 실행 결과는 push 후 확인한다.

## 남아 있는 한계

- 서명은 입력값의 무결성을 확인하며 실제 검사정보의 진실성을 보장하지 않는다.
- 핵심 클레임을 검증하는 자체 VC 형식이다. 모든 설명 필드가 서명된 것은 아니다.
- 로그인 참여자는 공통 운영 권한이다. 실서비스 역할 분리·감사 체계는 별도 범위다.
- 오프체인 데이터는 암호화하지 않는다. 가상 데이터만 사용한다.
- VC 발급 재시도는 갱신으로 처리될 수 있다. NFT 발급의 멱등성 기능과 다르다.
- 알려진 공개 기본키 차단은 모든 유출키를 탐지하는 장치가 아니다. 노출된 키는 사용 중단과 재발급이 필요하다.
- DB와 키 백업, 실제 브라우저·지갑 흐름, 새 환경 실행은 자동 API 테스트와 별도로 확인한다.
