# Web3 헌혈 이력 / 병원 매칭 시스템 (blockhack.kr)

## 아키텍처 (2026-09-08 현재)

제출용 MVP는 **증서 흐름 한 줄기**로 좁혔다.

```
D 프론트엔드              C 백엔드 (API + ethers.js)        A 스마트컨트랙트 (Sepolia)
증서 목록 / 상세      →   /certificate                 →   헌혈 증서 (ERC-721)  ← 미배포
병원 검증 / 실패          (Transfer 로그 → 타임라인)         Transfer / CertificateUsed
혈액원 발급               /certificate/issue                issue()  ← 발급자 롤 필요
```

**아직 살아있는 원래 계획 (증서 MVP와 별개, 소비 화면 없음)**

```
C 백엔드 /donation   →   해시 등록 컨트랙트 (record/verify/query)   ← A 미배포
C 백엔드 /match      →   B DID 모듈 (VC 보관 · 조건 필터링)         ← B 미구현
```

- 이 두 라우트를 쓰던 화면(`/donor`, `/hospital`)은 2026-09-08에 삭제했다. 백엔드 라우트는
  A·B와의 계약이라 남겨뒀지만, **현재 프론트엔드에 소비자가 없다.**

**데이터 분리 원칙**
- 온체인: 익명 해시, 타임스탬프, 혈액형
- 오프체인: 실명, 연락처, 상세 신상정보
- 개인정보는 절대 온체인에 올리지 않음

## 제출용 MVP 목표 — 헌혈 증서 5화면

기능을 넓히지 않고 하나의 흐름을 깊게 만든다. 화면이 허전한 이유는 기능이 적어서가 아니라
"온체인이라는 증거"가 안 보여서이므로, 증거를 화면에 직접 드러내는 데 집중한다.

| 화면 | 경로 | 내용 |
| --- | --- | --- |
| 증서 목록 (지갑) | `/certificates` | 보유 증서 카드 목록 + 양도 |
| 증서 상세 | `/certificates/:tokenId` | 이력 타임라인 + 온체인 증거 |
| 병원 검증 | `/verify` | 번호 입력 → 판정 → 사용 처리 |
| 검증 실패 | `/verify` (판정 결과) | 이중사용 차단 화면 |
| 혈액원 발급 | `/issue` | 지갑 주소 + 혈액형 → 민팅 (2026-09-09 추가) |

핵심 3가지:

1. **이력 타임라인은 직접 만들지 않는다.** ERC-721은 전송마다 `Transfer` 이벤트를 자동으로
   남기므로 로그를 읽으면 이력이 공짜로 나온다(발급 = `from`이 zero address인 Transfer).
   종이 증서에는 누가 언제 누구에게 넘겼는지가 남지 않는다 — 화면 하나로 증명되는 차별점.
2. **온체인 증거 블록.** 모든 동작 뒤에 트랜잭션 해시와 Etherscan 링크를 노출한다.
   "화면만 만든 게 아니라 정말 체인에 올렸다"가 클릭 한 번으로 확인된다.
3. **실패 화면이 하이라이트.** 이미 사용한 증서를 다시 검증하면 크고 명확한 빨간 화면으로
   막는다. 이 화면 하나가 "왜 블록체인인가"를 통째로 설명한다.
4. **발급이 있어야 생애 전체가 실연된다.** 발급 → 양도 → 검증 → 이중사용 차단까지 증서 한 장이
   데모 자리에서 처음부터 끝까지 돌아간다. 목업으로 미리 심어둔 증서에서 시작하지 않아도 된다.

## 담당

- A: 스마트컨트랙트 (헌혈 이력 컨트랙트, Sepolia 배포)
- B: DID 모듈 (VC 보관, 조건 필터링)
- C: 백엔드 (API 서버, ethers.js 연동, 서명 검증) — `backend/`
- D: 프론트엔드 (지갑 연결, 화면) — `frontend/`

## 스마트컨트랙트 진행 순서

1. ~~Hardhat 프로젝트 세팅 (`contract/`)~~ 완료
2. ~~`BloodCertificate.sol` / `DonationRegistry.sol` 구현 — backend의 `*.sample.abi.json`과 함수/이벤트
   시그니처를 맞추고, `AccessControl`로 발급자 롤(`ISSUER_ROLE`/`RECORDER_ROLE`) 적용~~ 완료
3. ~~테스트 작성 및 통과 (발급 / 권한 없는 계정의 issue 거부 / 이중사용 차단)~~ 완료
4. ~~Sepolia 배포~~ 완료 (2026-09-09). 배포 주소는 `contract/README.md` "배포 현황" 참고
5. **남은 것 — C의 relayer 지갑 주소를 받아 두 컨트랙트에 `ISSUER_ROLE`/`RECORDER_ROLE` 부여.**
   이게 없으면 backend가 `issue()`/`record()`를 호출할 권한이 없다.
6. **남은 것 — 배포 주소 + 실제 ABI를 C에게 전달.** `backend/.env`의 `CERTIFICATE_CONTRACT_ADDRESS`/
   `DONATION_CONTRACT_ADDRESS`와 두 `*.sample.abi.json`을 교체해야 501 응답이 실제 온체인 호출로 바뀐다.
7. (선택) Etherscan 소스 검증 (`npm run verify:sepolia`)

자세한 내용은 `contract/README.md` 참고.

## 백엔드 진행 순서

1. Node/Express 기본 서버 세팅
2. ethers.js로 컨트랙트 함수 호출 연습 (A 컨트랙트 배포 전엔 더미 ABI로)
3. 지갑 서명 검증 로직 단독 테스트 (MetaMask는 프론트 전용이므로, 프론트가 보낼 서명을 검증하는 쪽을 먼저 테스트)
4. A의 실제 컨트랙트 주소/ABI로 교체 + B(DID 모듈)와의 API 계약 연동

자세한 내용은 `backend/README.md` 참고.


## 프론트엔드 진행 순서

1. ~~React + TypeScript + Vite 기본 프로젝트 세팅~~ 완료
2. ~~아트보드 기준 헌혈자 앱(`/donor`)·병원 콘솔(`/hospital`) 재구현~~ → **2026-09-08 삭제.**
   증서 흐름과 무관해서 제거했다 (`frontend/README.md` "결정된 사항" 참고)
3. ~~`window.ethereum` 기반 실제 지갑 연결~~ 완료
4. ~~`VITE_DEMO_MODE` 로 데모 목업 ↔ 실제 API 전환 구조 + Zod 응답 검증~~ 완료
5. ~~증서 4화면 (목록 / 상세 타임라인 / 병원 검증 / 이중사용 차단)~~ 완료
6. **남은 것 — A의 증서 컨트랙트 배포 대기.** 붙이면 데모의 가짜 트랜잭션 해시가 실제 해시로
   바뀌고 Etherscan 링크가 살아난다

자세한 내용은 `frontend/README.md` 참고.

## 백엔드·프론트 호환성 결정사항 (2026-09-07)

- **혈액형 매핑**: API 계약은 `"A"|"B"|"AB"|"O"` 문자열로 유지, 컨트랙트 `uint8` 변환(`A=0, B=1, AB=2, O=3`)은
  백엔드(`backend/src/utils/bloodTypeMap.js`)에서만 처리.
- **지갑주소 → 헌혈 이력 전체 목록**: `/donation` 범위에서는 별도 API를 만들지 않는다는 결정을 유지.
  - 단, **증서(ERC-721)의 보유 목록은 예외**로 `GET /certificate?owner=` 를 만들었다. 해시 기반
    `/donation` 과 달리 ERC-721은 `Transfer` 이벤트의 indexed `to` 로 필터링할 수 있어 별도
    인덱서 없이 RPC만으로 조회가 가능하기 때문.
  - 당시 근거였던 프론트 더미 데이터(`donorMock.ts`)는 화면과 함께 삭제됐다.
- **미구현(외부 모듈 미연결) 응답**: `501` + `{ error, detail? }` 형태로 통일. 프론트는 이를
  `ApiError.notImplemented`로 동일하게 처리.

## 발급(`POST /certificate/issue`) 계약 — 2026-09-09

- **요청 본문은 `to`(헌혈자 지갑) + `bloodType` 둘뿐이다.**
  - `issuer`(발급기관)를 클라이언트에서 받지 않는다. 받으면 아무나 발급기관을 자기 마음대로
    적을 수 있고, 검증 화면의 "OO혈액원 발급"이 의미를 잃는다. 서버 설정
    `BLOOD_CENTER_NAME`(기본값 `대전혈액원`)에서만 결정한다.
  - `issuedAt`은 컨트랙트의 `block.timestamp`, `tokenId`는 컨트랙트 자동 증가.
- **혈액형은 헌혈자 신고값이 아니라 혈액원 검사 결과.** (`/donation/auth`는 프론트가 보낸
  `bloodType`을 그대로 기록하는 구조인데, 발급에서 그러면 증서의 신뢰가 깨진다.)
- **새 tokenId는 발급 트랜잭션 영수증에서 읽는다.** `issue()`가 tokenId를 return하지만 상태를
  바꾸는 호출의 반환값은 오프체인에서 읽을 수 없어, `Transfer(0x0 → to)` 로그에서 꺼낸다.

### A와 협의할 항목 (블로커)

- ~~컨트랙트에 `issue(address to, uint8 bloodType, string issuer)` 추가.~~ 완료 (2026-09-09 Sepolia 배포,
  `contract/README.md` "배포 현황" 참고)
- ~~발급자 롤(`onlyIssuer` / OpenZeppelin `AccessControl`) 필수.~~ 완료. 단, **백엔드 signer를 그 롤에
  등록하는 건 아직 안 됨** — `BACKEND_SIGNER_ADDRESS`를 A에게 전달하면 부여받을 수 있다
  (위 "스마트컨트랙트 진행 순서" 5번).
- (선택, 미착수) `/donation/auth`의 `donationHash`를 증서에 묶으면 "이 증서는 실제 헌혈 기록에서
  나왔다"까지 증명된다. 현재 ABI에 해당 필드가 없다.

### C가 남긴 것

- **혈액원 직원 인증.** `POST /certificate/issue`는 지금 무인증이라 데모 전용이다.
- **다중 혈액원 지원.** `BLOOD_CENTER_NAME` 단일 값 하드코딩 (프론트 `HOSPITAL_NAME`과 같은 처지).

자세한 내용은 각각 `backend/README.md`, `frontend/README.md` 참고.
