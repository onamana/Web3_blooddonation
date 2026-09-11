# DID / VC 자격 검증 서비스

가상 헌혈자의 지갑 식별자(`did:ethr:0x…`)와 혈액형·적격 여부·최근 헌혈일을 담은 VC를 발급·검증한다. 최신 유효 VC로 후보자를 검색하며 블록체인 NFT 발급·양도와는 별도 서비스다.

전체 실행·HTTPS 배포: [데모 배포 안내](../docs/demo-deployment.md).

## 실행

Node.js 24 이상. `did/.env.example`을 `did/.env`로 복사하고 `DID_ISSUER_PRIVATE_KEY`, `DID_ISSUE_API_KEY`를 설정한다.

```powershell
npm ci
npm run dev
# 또는
npm start
```

기본 포트 5001. 백엔드의 `DID_MODULE_BASE_URL=http://localhost:5001`과 동일한 `DID_ISSUE_API_KEY`를 설정한다. 프론트는 내부 API 키를 갖지 않고 백엔드만 호출한다.

## API

`/health` 외 자격·매칭 API는 `x-api-key`가 필요하다. `/vc` 전체 조회는 development에서만 허용하며 키 인증도 필요하다.

| 경로 | 본문 | 결과 |
| --- | --- | --- |
| GET /health | 없음 | 상태, 발급기관 DID |
| POST /vc/issue | holderAddress, bloodType, isEligible, lastDonationDate, daysValid(선택) | 201 `{success:true,vc}` |
| POST /vc/verify | `{vc: {...}}` | `{isValid,reason?}` 또는 `{isValid:true,verifiedData}` |
| POST /vc/revoke | `{id:"urn:uuid:…"}` | `{success:true}`, 없으면 404 |
| POST /match | bloodType(선택), minDaysSinceLastDonation(선택), onlyEligible(선택) | matchedCount, matches |

발급 입력: 지갑 주소, A/B/AB/O 혈액형, 명시적인 boolean 적격 여부, `YYYY-MM-DD` 실제 최근 헌혈일(미래 불가)이 필수다. 유효기간은 1~365일, 기본 90일이다. 알 수 없는 발급·매칭 필드는 거절한다. 백엔드의 매칭 기본값은 최소 60일·적격자만이며, DID 직접 호출에서 경과 일수를 생략하면 해당 조건은 적용하지 않는다.

## 저장과 갱신

- 기본 DB는 `did/data/credentials.sqlite`. `DID_DB_PATH`로 경로 변경 가능.
- 동일 지갑에 새 VC를 발급하면 트랜잭션 안에서 이전 VC를 취소하고 새 VC를 저장한다. 후보자는 지갑당 하나다.
- VC ID도 서명에 포함되어 ID만 바꿔 취소를 회피할 수 없다.
- 취소·갱신 기록은 재시작 후 유지된다. DB와 발급기관 키를 함께 백업해야 한다.
- `DID_SEED_DEMO=true`는 비운영 환경에서만 선택적으로 샘플을 생성한다. 기본은 생성하지 않는다. production에서 true이면 시작을 거절한다.
- 키를 변경하면 기존 발급기관을 신뢰하지 않으므로 이전 VC를 검증할 수 없다. 다중 발급기관·키 회전은 이 데모 범위 밖이다.

## 서명의 의미

VC 형태의 JSON과 자체 정렬한 JSON payload에 ethers `signMessage`/`verifyMessage`를 사용하는 데모 구현이다. `proof.jws`는 필드 이름과 달리 Ethereum 메시지 서명이며 표준 JWS 토큰은 아니다. 외부 W3C VC 구현과의 상호운용성·DID 문서 해석·영지식 증명을 제공하지 않는다.

검증은 신뢰한 기관의 서명, 서명 대상의 변경, 만료, 취소를 검사한다. 실제 검사정보의 진실성·의료 적합성을 판단하지 않는다. 후보자 결과에는 지갑 기반 DID와 혈액형·최근 헌혈일이 포함되므로 익명 데이터가 아니다. 공개 인터넷에는 DID 포트를 열지 않고 인증된 데모 백엔드만 접근시킨다.

## 테스트

```powershell
npm test
cd ../backend
npm run test:did
```

단위 테스트는 정상 서명·변조·만료·API 인증을 확인한다. 백엔드 통합 테스트는 로그인과 실제 DID 프로세스, DB 재시작, 갱신·취소·후보자 제외, 연결 실패를 확인한다. 테스트 데이터와 DB는 운영 데이터와 분리된다.
