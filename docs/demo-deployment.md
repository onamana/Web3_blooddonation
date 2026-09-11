# DID 통합 데모 실행·배포

이 구성은 **가상 헌혈 정보와 테스트넷 자산을 사용하는 초대형 데모**다. 운영자가 공유한 접속 암호를 아는 참여자는 증서 발급·사용과 자격 등록·취소를 할 수 있다. 실제 병원 계정 인증, 의료 적합성 판정, 환자 배정은 포함하지 않는다.

## 기능과 데이터 경계

| 대상 | 기능 | 저장 |
| --- | --- | --- |
| 헌혈증서 NFT | 발급, 지갑 서명에 의한 양도, 사용, 중복 사용 차단, 이력 | BloodCertificate 컨트랙트 |
| 헌혈 기록 | 식별자 해시와 시각 | DonationRegistry 컨트랙트 |
| 증서 부가정보 | 헌혈 종류·용량, 발급 재시도 복구 | 백엔드 SQLite |
| 개인 자격 VC | 기관 서명, 변조·만료 검증, 갱신·취소, 후보자 필터링 | DID SQLite |

증서가 다른 사람에게 양도돼도 원래 헌혈자의 자격·혈액형은 이전되지 않는다. 기존 공개 증서 응답과 컨트랙트에 혈액형을 추가하지 않았다. VC 발급과 NFT 발급은 별도 작업이며 자동 연계·분산 트랜잭션을 구현했다고 해석하면 안 된다.

## 가장 빠른 로컬 실행

Node.js 24와 npm이 필요하다. 저장소 루트에서 한 번 설치·컴파일한다.

```powershell
npm.cmd --prefix contract ci
npm.cmd --prefix contract run compile
npm.cmd --prefix backend ci
npm.cmd --prefix did ci
npm.cmd --prefix frontend ci
node scripts/demo-local.mjs
```

접속: **http://localhost:5175/credentials**

- `.demo/secrets.json`의 `accessPassword`로 로그인한다. 이 파일은 Git에서 제외된다.
- `.demo/connection.json`에 로컬 지갑 주소, 컨트랙트 주소와 RPC가 기록된다.
- 필요하면 로컬 테스트 전용 `donorPrivateKey`를 MetaMask에 가져오고 RPC `http://127.0.0.1:18545`, chain ID `31337`, 통화 `ETH`인 로컬 네트워크를 추가한다. 실제 자산이 든 지갑을 가져오지 않는다.
- 최초 실행에 가상 O형 후보자 한 명만 등록한다. 취소·갱신 상태는 이후 실행에도 유지된다.
- 자격·매칭, 증서 발급·검증 화면은 지갑 연결 없이도 시연할 수 있다. 실제 소유자 서명이 필요한 양도는 MetaMask를 연결한다.
- 기존 '데모 체험' 버튼은 메모리 목업 증서 흐름이다. 블록체인 실동작 시연에서는 실제 지갑 연결을 사용한다.
- `Ctrl+C`로 네 서비스를 함께 종료한다. 로컬 블록체인은 재시작하면 초기화된다. VC와 백엔드 DB는 `.demo/`에 남으며, 새 컨트랙트는 별도 주소로 배포되어 이전 기록과 구분된다.
- 사용 포트: 로컬 체인 18545, 백엔드 4100, DID 5101, 프론트 5175. 기존 4000/5001/5173 개발 서버와 겹치지 않는다.
- 이 실행기는 Sepolia에 트랜잭션을 보내지 않는다. `.env`의 기존 체인·키 설정 대신 로컬 생성값을 프로세스 환경변수로 전달한다.

## 화면 시연 순서

1. 로그인 → `자격·매칭`에서 O형/60일 조건으로 기본 후보자 조회.
2. 가상 지갑 주소·혈액형·최근 헌혈일·명시적인 적격 여부로 자격 VC 발급.
3. 자동으로 채워진 JSON으로 검증 성공 확인. 혈액형만 바꿔 검증 실패 확인.
4. 같은 지갑으로 부적격 VC를 새로 발급하면 이전 VC 검증 실패, 적격 후보자 검색에서 제외됨을 확인.
5. VC ID와 확인 체크로 취소 → 검증 실패, 후보자 목록에서 제외 확인.
6. `혈액원 발급`에서 별도로 NFT 증서 발급 → 번호를 `증서 검증` 화면에서 조회.
7. 지갑 연결 → 내 증서에서 양도 서명 → 양도·사용 이력 확인. 사용 처리 후 재사용·양도 차단 확인.

최근 헌혈일이 없는 사람은 이 데모 등록 모델에 포함하지 않는다. 적격 여부는 입력된 가상 판정값이고, Rh·혈액제제 적합성·실제 검사 검증은 구현하지 않았다.

## HTTPS 배포 (Sepolia)

Docker Engine + Compose가 있는 서버와 그 서버를 가리키는 도메인이 필요하다. 80/443만 외부에 연다. 백엔드 4000과 DID 5001에는 공개 포트 매핑이 없다.

1. `deploy/.env.example`을 `deploy/.env`로 복사하여 값을 채운다.
2. `DEMO_DOMAIN`: `demo.your-domain.com` 형태의 실제 호스트명. 프로토콜·경로·포트는 넣지 않는다.
3. `DEMO_ACCESS_PASSWORD`: 16자 이상. `DEMO_SESSION_SECRET`, `DID_ISSUE_API_KEY`: 각각 독립적인 32자 이상의 무작위 값.
4. `DID_ISSUER_PRIVATE_KEY`: VC 서명용 별도 키. 가스·온체인 롤은 필요 없다. 변경하면 기존 발급기관의 VC를 현재 검증기가 신뢰하지 않으므로 그대로 보관한다.
5. `BACKEND_SIGNER_PRIVATE_KEY`: 해당 Sepolia 컨트랙트의 ISSUER_ROLE/RECORDER_ROLE이 있는 테스트 전용 지갑. 테스트 ETH를 충전한다.
6. 컨트랙트 주소와 시작 블록은 실제 사용하려는 `contract/deployments/` manifest를 확인해 입력한다. ABI가 다른 예전 주소를 사용하지 않는다.

```powershell
# 루트에서. 읽기 전용 설정·Sepolia·역할·잔액·인터페이스 검사
node scripts/preflight-demo.mjs

# 구성 검증 (비밀값이 출력되지 않는 -q 옵션)
docker compose --env-file deploy/.env -f deploy/compose.yaml config -q
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
```

Caddy가 도메인의 HTTPS를 제공하고 `/api/*`를 백엔드로 전달한다. 브라우저 → 백엔드는 HttpOnly/SameSite=Strict/Secure 세션 쿠키, 백엔드 → DID는 내부 API 키로 인증한다. POST는 `X-Demo-Request: 1`을 요구한다. 로그인은 IP별 15분에 실패 10회로 제한되며 세션 유효기간은 8시간이다. 세션은 서명된 쿠키 방식이며 로그아웃은 해당 브라우저 쿠키를 삭제한다. 전체 세션 강제 만료는 세션 키를 바꾸고 백엔드를 재시작한다.

운영 환경에서 암호·세션 키·내부 키가 없거나 너무 짧으면 서버 시작을 거부한다. DID 샘플 자동 생성도 production에서 차단한다. `/health` 외 API는 데모 로그인이 필요하다. 실제 배포에서 `.env`나 컨테이너 설정 전체를 공개 로그에 출력하지 않는다.

확인할 주소:

- `https://도메인/credentials`: 로그인, VC 발급·검증·취소·검색
- `https://도메인/certificates`: 기존 증서 화면
- `https://도메인/api/health`: 프로세스 상태
- `https://도메인/api/docs`: 로그인 후 API 문서 (Try it out의 POST에는 위 헤더 필요)

`/health`는 RPC·DID·DB 전체 가용성을 보장하는 검사가 아니다. 실제 배포 완료 판정은 로그인부터 실제 VC 발급·검색까지 확인하고, Sepolia 증서 한 건의 발급·양도·사용을 별도로 시연한 뒤 내린다. 공개 배포 시 서버/도메인·키·잔액은 배포 담당자가 제공해야 한다.

## 저장·복구

- Compose의 `certificate_data`, `credential_data` 볼륨에 두 SQLite DB가 저장된다. 컨테이너 교체·재시작으로 지워지지 않는다.
- 백업 전 백엔드와 DID를 정지하고 **볼륨 전체(DB와 WAL/SHM 포함)**를 복사한다. 복구는 서비스를 정지한 상태에서 같은 경로·권한으로 복원한 후 시작한다.
- DID DB와 발급기관 키를 함께 보존한다. DB를 지우면 취소·갱신 이력이 사라진다.
- `docker compose down -v`는 데이터 볼륨을 삭제하므로 사용하지 않는다.
- 이 데모는 백엔드 1개와 DID 1개 인스턴스를 전제로 한다. 다중 인스턴스 확장은 별도 작업이다.

## 검증 명령

```powershell
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
npm.cmd --prefix did test
npm.cmd --prefix contract test
npm.cmd --prefix backend run test:integration
npm.cmd --prefix backend run test:did
```

기존 통합 테스트는 실제 로컬 컨트랙트와 프론트 API를 사용해 증서 발급·양도·사용·재시도 복구를 검사한다. DID 통합 테스트는 production 설정으로 로그인/CSRF/내부 인증, 입력 거절, 발급·변조·매칭, 갱신·취소, DB 재시작, 장애 시 오류, 로그인 횟수 제한을 검사한다. 외부 Sepolia 트랜잭션이나 실제 개인정보를 사용하지 않는다.
