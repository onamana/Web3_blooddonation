# 🩸 Blood Donation DID / VC Service (Module B)

> **W3C Verifiable Credentials Data Model 1.0** 및 이더리움 타원곡선 서명 알고리즘(**secp256k1 / Keccak-256**)을 준수하는 탈중앙화 신원증명(DID) 및 전자 자격증명(VC) 발급·검증 엔진입니다.

---

## 1. 아키텍처 및 설계 원칙

본 모듈은 블록체인 기반 헌혈 시스템의 핵심 요구사항인 **"의료 데이터 프라이버시 보호"**와 **"데이터 무결성 보장"**을 만족하기 위해 다음과 같이 설계되었습니다.

### 🔒 개인정보 오프체인 분리 원칙 (Data Privacy)
- **온체인 최소화**: 헌혈자의 혈액형, 적격 판정 여부, 최근 헌혈 일자 등 민감한 개인의료정보(PHD)는 가스비 낭비 및 개인정보 유출을 방지하기 위해 블록체인에 영구 기록하지 않습니다.
- **오프체인 VC 암호화 서명**: 공인 발급기관(혈액원)의 비대칭 개인키(secp256k1)를 이용해 EIP-191 규격 서명을 생성하고, 데이터 위변조 여부는 공개키 복구(`ecrecover`)를 통해 수학적으로 증명합니다.

### 📜 표준 준수 스펙
- **DID Method**: `did:ethr` (Ethereum Address 기반 식별자)
- **Issuer DID**: `did:ethr:0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1` (대한적십자사/혈액원 발급 노드)
- **Proof Type**: `EthereumPersonalSignature2020` (Keccak-256 해시 기반 무결성 검증)

---

## 2. 시스템 데이터 흐름 (Workflow)

```text
[ 병원 / 수혈 요청자 ]
        │ 1. POST /match (혈액형, 최근 헌혈일 기준)
        ▼
[ Backend API (C) ] ── (중계) ──▶ [ DID Module (B) - Port 5001 ]
                                            │
                                            ├─ 2. 저장된 VC의 전자서명 검증 (verifyMessage)
                                            ├─ 3. 데이터 위변조/만료(exp) 여부 체크
                                            └─ 4. 조건 부합 적격자(Eligible) 선별
                                            ▼
[ Backend API (C) ] ◀── (검증 완료 DID 반환) ─┘
3. 사전 요구사항 및 환경 설정 (Prerequisites)
Node.js: v18.0.0 이상 권장 (LTS)

포트 가용성: 5001번 포트 (모듈 기본 바인딩 포트)

필수 의존 패키지 (Dependencies):

express: RESTful API 라우팅 게이트웨이

ethers: EIP-191 서명(signMessage) 및 타원곡선 서명 검증(verifyMessage)

cors: 교차 출처 리소스 공유 허용

dotenv: 환경변수 관리

⚠️ 알림: 실제 패키지 바이너리(node_modules/)는 Git 저장소 추적에서 제외되어 있으므로, 저장소를 내려받은 후 반드시 아래의 설치 과정을 진행해야 합니다.

4. 디렉터리 구조 및 핵심 모듈
Plaintext
did/
├── src/
│   ├── services/
│   │   └── vcService.js    # W3C VC 생성, Keccak-256 서명/검증 및 후보자 필터링 코어
│   └── server.js           # Express 기반 API 게이트웨이 (Port 5001)
├── .gitignore              # node_modules 및 환경변수 배제 설정
├── package.json            # 의존성 및 실행 스크립트 정의
└── README.md
issueBloodVC(holderAddress, bloodType, isEligible):
credentialSubject를 구성하고 혈액원 개인키로 서명 날인된 W3C 규격 VC 객체를 생성합니다.

verifyBloodVC(vc):
proof.rawPayload와 proof.jws 서명값을 대조하여 데이터 위변조 여부를 검증하고 유효기간(expirationDate)을 판정합니다.

matchCandidates({ bloodType, recentDonationWithinDays, onlyEligible }):
서명 무결성 검증을 통과한 신뢰 데이터 중 병원의 요청 조건에 부합하는 대상자 DID 목록을 추출합니다.

5. API 명세 (Endpoints)
GET /health
모듈의 동작 상태 및 발급기관(Issuer) DID를 조회합니다.

JSON
{
  "status": "ok",
  "module": "DID/VC Service",
  "issuerDid": "did:ethr:0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
}
GET /vc
현재 발급기관 서명이 완료된 전체 VC 목록을 조회합니다. (디버깅 및 시연용)

POST /vc/issue
신규 헌혈자에게 혈액원 서명이 날인된 VC를 발급합니다.

Request Body:

JSON
{
  "holderAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "bloodType": "O",
  "isEligible": true
}
POST /match
백엔드(C)의 요청을 수신하여 서명 검증을 거친 최적의 헌혈 후보자를 선별합니다.

Request Body:

JSON
{
  "bloodType": "O",
  "recentDonationWithinDays": 90,
  "onlyEligible": true
}
Response (200 OK):

JSON
{
  "success": true,
  "query": {
    "bloodType": "O",
    "recentDonationWithinDays": 90,
    "onlyEligible": true
  },
  "matchedCount": 1,
  "matches": [
    {
      "holderDid": "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "bloodType": "O",
      "isEligible": true,
      "lastDonationDate": "2026-09-10",
      "issuerDid": "did:ethr:0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
      "verifiedSignature": true
    }
  ]
}
6. 설치 및 실행 가이드
1) 의존성 설치
Bash
# did 디렉터리로 이동
cd did

# package.json에 정의된 필수 의존성 일괄 설치
npm install
2) 서비스 실행
Bash
# 개발 모드로 실행 (Watch 모드)
npm run dev

# 또는 직접 실행
node --watch src/server.js
구동 성공 시 http://localhost:5001에서 수신 대기합니다.

3) 백엔드(C) 연동 설정 (필수)
백엔드(backend/)가 본 DID 모듈과 통신할 수 있도록 backend/.env 파일에 아래 환경변수를 반드시 선언해야 합니다:

코드 스니펫
DID_MODULE_BASE_URL=http://localhost:5001

---

### 복사 후 체크
1. `did/README.md`에 전체 붙여넣기 후 **`Ctrl + S`**로 저장합니다.
2. 이제 터미널에서 다음 명령어를 쳐서 상태를 확인합니다:
   ```cmd
   git status