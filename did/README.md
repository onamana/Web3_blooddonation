# DID / VC 자격 검증 서비스

가상 헌혈자의 지갑 식별자(`did:ethr:0x…`)와 혈액형·적격 여부·최근 헌혈일을 담은 VC를 발급·검증한다. 최신 유효 VC로 후보자를 검색하며 블록체인 NFT 발급·양도와는 별도 서비스다.

전체 실행·HTTPS 배포: [데모 배포 안내](../docs/demo-deployment.md).
평가용 첫 실행과 Web3 활용 범위: [통합 README](../README.md). 로컬 실행기는 DID를 포함한 전체 서비스를 자동으로 구성합니다.

## 반영된 보완 사항

| 검토 항목 | 현재 구현 |
| --- | --- |
| 표시정보 변조 | issuer·holder·혈액형·적격 여부·날짜·VC ID와 서명 payload 대조 및 재구성 |
| 매칭 신뢰 경계 | 검증 성공 시의 verifiedData만 필터링에 사용 |
| 만료 경계 | 만료 시각에 도달하면 무효, 직전·경계·직후 테스트 |
| 키 관리 | 환경변수 필수, 잘못된 키의 안전한 오류, 공개 Hardhat 기본키의 테스트 외 사용 차단 |
| API 보호 | 내부 키 인증, 허용 Origin, 운영 전체 목록 차단 |
| 입력/오류 | 대문자 혈액형·정수 기간·boolean·날짜·객체 본문 검증, 검증 예외 메시지 비노출 |
| 영속성 | SQLite 갱신·취소 상태와 재시작 후 보존 |

외부 설명 필드까지 모두 서명하는 표준 VC 구현은 아닙니다. JSON 공백이나 속성 순서 변경은 자격정보 변조와 구분합니다.

## 실행

Node.js 24 이상. `did/.env.example`을 `did/.env`로 복사하고 `DID_ISSUER_PRIVATE_KEY`, `DID_ISSUE_API_KEY`를 설정한다.

저장소 루트에서 백엔드 의존성 설치 후 `node scripts/setup-did-env.cjs`를 실행하면 DID 키와 내부 API 키, 백엔드 로그인 암호·세션 키를 생성한다. 채워진 값은 보존하며 양쪽 내부 키가 다르거나 기존 값이 짧으면 덮어쓰지 않고 실패한다. 비밀값은 출력하지 않는다. 접속 암호는 `backend/.env`의 `DEMO_ACCESS_PASSWORD`에서 로컬로 확인한다. 실제 개인키가 든 `.env`는 제출하지 않는다.

```powershell
npm ci
npm run dev
# 또는
npm start
```

기본 포트 5001. 백엔드의 `DID_MODULE_BASE_URL=http://localhost:5001`과 동일한 `DID_ISSUE_API_KEY`를 설정한다. 프론트는 내부 API 키를 갖지 않고 백엔드만 호출한다.

| 환경변수 | 설명 |
| --- | --- |
| DID_ISSUER_PRIVATE_KEY | VC 서명용 개인키. ETH나 온체인 역할이 필요하지 않음 |
| DID_ISSUE_API_KEY | 승인된 백엔드와 공유하는 내부 인증키, 생성 도구는 무작위 64자리 hex 사용 |
| PORT / HOST | 기본 5001 / 127.0.0.1 |
| NODE_ENV | development 또는 production; 테스트는 test |
| DID_ALLOWED_ORIGINS | 허용 브라우저 Origin, 기본 http://localhost:4000 |
| DID_DB_PATH | 기본 did/data/credentials.sqlite |
| DID_SEED_DEMO | 기본 false, production에서 true 사용 금지 |

내부 키가 없으면 서버가 시작되지 않으며 production에서는 32자 이상을 요구한다. HTTP 요청에는 `x-api-key`로 전달한다. 키를 프론트 환경변수나 저장소 문서에 넣지 않는다.

## API

`/health` 외 자격·매칭 API는 `x-api-key`가 필요하다. `/vc` 전체 조회는 development에서만 허용하며 키 인증도 필요하다.

| 경로 | 본문 | 결과 |
| --- | --- | --- |
| GET /health | 없음 | 상태, 발급기관 DID |
| POST /vc/issue | holderAddress, bloodType, isEligible, lastDonationDate, daysValid(선택) | 201 `{success:true,vc}` |
| POST /vc/verify | `{vc: {...}}` | `{isValid,reason?}` 또는 `{isValid:true,verifiedData}` |
| POST /vc/revoke | `{id:"urn:uuid:…"}` | `{success:true}`, 없으면 404 |
| POST /match | bloodType(선택), minDaysSinceLastDonation(선택), onlyEligible(선택) | matchedCount, matches |

발급 입력: 유효한 지갑 주소, 대문자 A/B/AB/O 혈액형, 명시적인 boolean 적격 여부, `YYYY-MM-DD` 형식의 유효한 가상 최근 헌혈일(미래 불가)이 필수다. 주소는 DID 발급 시 checksum으로 정규화한다. 유효기간은 정수 1~365일, 기본 90일이다. 알 수 없는 발급·매칭 필드 및 JSON 객체가 아닌 본문은 거절한다. 양쪽 매칭 기본값은 최소 60일·적격자만이며 경과 일수는 정수 0~36500이다. 0은 경과일 제한 없이 조회한다는 의미이며 의료 기준이 아니다.

## 저장과 갱신

- 기본 DB는 `did/data/credentials.sqlite`. `DID_DB_PATH`로 경로 변경 가능.
- VC는 평문으로 저장된다. 오프체인 저장이나 전자서명이 암호화·익명화를 의미하지 않는다. 가상 데이터만 입력한다.
- 동일 지갑에 새 VC를 발급하면 트랜잭션 안에서 이전 VC를 취소하고 새 VC를 저장한다. 후보자는 지갑당 하나다.
- VC ID도 서명에 포함되어 ID만 바꿔 취소를 회피할 수 없다.
- 취소·갱신 기록은 재시작 후 유지된다. DB와 발급기관 키를 함께 백업해야 한다.
- `DID_SEED_DEMO=true`는 비운영 환경에서만 선택적으로 샘플을 생성한다. 기본은 생성하지 않는다. production에서 true이면 시작을 거절한다.
- 키를 변경하면 기존 발급기관을 신뢰하지 않으므로 이전 VC를 검증할 수 없다. 다중 발급기관·키 회전은 이 데모 범위 밖이다.

## 서명의 의미

VC 형태의 JSON과 자체 정렬한 JSON payload에 ethers `signMessage`/`verifyMessage`를 사용하는 데모 구현이다. `proof.jws`는 필드 이름과 달리 Ethereum 메시지 서명이며 표준 JWS 토큰은 아니다. 외부 W3C VC 구현과의 상호운용성·DID 문서 해석·영지식 증명을 제공하지 않는다.

검증은 신뢰한 기관의 서명, 서명 대상의 변경, 만료, 취소를 검사한다. 실제 검사정보의 진실성·의료 적합성을 판단하지 않는다. 후보자 결과에는 지갑 기반 DID와 혈액형·최근 헌혈일이 포함되므로 익명 데이터가 아니다. 공개 인터넷에는 DID 포트를 열지 않고 인증된 데모 백엔드만 접근시킨다.

## 접근 권한과 키 수명

보완 항목별 근거: [보안 검토 대응](../docs/security-review.md).

데모 참여자는 가상 발급기관의 공통 운영 권한으로 적격 여부를 직접 입력한다. 실제 혈액원 신원·검사 결과를 확인하는 기능은 없다. 기본 실행 주소는 loopback이며 백엔드는 접속 암호 없이 시작하지 않는다. `DEMO_ALLOW_UNAUTHENTICATED=true`는 `HOST=127.0.0.1` 또는 `::1`, 비운영 환경, 프록시 미사용에서만 허용된다. 암호가 설정된 상태와 동시에 사용할 수 없다.

테스트 파일의 공개 테스트키는 테스트에만 사용한다. 알려진 Hardhat 기본 발급키는 테스트 외 실행에서 차단한다. 과거 공개된 키를 숨기는 것만으로 폐기할 수 없으며 해당 키의 사용을 중단하고 새 키로 VC를 재발급해야 한다. 현재 키를 임의로 교체하지 말고 DB와 함께 보존한다.

## 테스트

```powershell
npm.cmd test
cd ../backend
npm.cmd run test:did
```

단위 테스트는 정상 서명·변조·만료·API 인증을 확인한다. 백엔드 통합 테스트는 로그인과 실제 DID 프로세스, DB 재시작, 갱신·취소·후보자 제외, 연결 실패를 확인한다. 테스트 데이터와 DB는 운영 데이터와 분리된다.

최근 로컬 검사에서 단위/API/시작 보안 테스트 30개, 백엔드–DID 통합 7개가 통과했다. 추가 테스트는 서명 손상·필수 구조 누락·타 발급기관 서명·정확한 만료 시각·최소 경과일 경계·빈 본문·기간 타입·기본값 일치를 다룬다. 자동 테스트 성공은 실제 의료정보의 진실성이나 외부 DID 지갑 상호운용성을 검증한 결과가 아니다.
