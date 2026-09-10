# DID / VC Blood Donation Eligibility Service

헌혈 적격 증명(Verifiable Credential)의 발급, 전자서명 무결성 검증, 그리고 수혈 대상자 매칭 엔진을 제공하는 오프체인 분산 신원인증 모듈입니다.

---

## 주요 기능 및 기술 스펙

* **오프체인 VC 전자서명 및 무결성 검증**: 발급기관(혈액원) 개인키 기반 ECDSA 전자서명(`EthereumPersonalSignature2020`)을 수행하며, Canonical JSON 직렬화를 통해 데이터 위·변조를 원천 차단합니다.
* **보안 및 접근 제어**: 발급 API(`POST /vc/issue`) 호출 시 서비스 시크릿 토큰(`x-api-key`) 기반 인증을 강제하며, 허용된 백엔드 Origin에 대해서만 CORS를 허용합니다.
* **엄격한 스키마 검증**: 이더리움 체크섬 주소, 지원 혈액형, 불리언 적격 여부 및 휴지기간(일수) 입력값에 대한 사전 검증을 수행합니다.
* **수혈 적격자 매칭**: 위·변조 검증을 거친 유효한 VC만을 대상으로 혈액형, 적격 여부, 최소 헌혈 경과 일수(`minDaysSinceLastDonation`) 기반 후보자를 선별합니다.

> **시스템 제한사항 (시연 및 MVP 기준)**:  
> 본 모듈의 VC 저장소는 시연용 인메모리(Memory) 구조로 동작하며, **서버 재시작 시 적재된 VC 데이터가 초기화**됩니다. 실제 운영 단계에서는 영속성 데이터베이스(DB) 및 키 관리 서비스(KMS/Vault) 연동이 필요합니다.

---

## 환경 설정 및 실행 방법

### 1. 환경변수 설정

저장소 루트에 위치한 `.env.example`을 복사하여 `.env` 파일을 생성하고 필수 값을 구성합니다.

```bash
cp .env.example .env
Ini, TOML
PORT=5001
NODE_ENV=development

# 발급기관 전자서명용 이더리움 개인키 (0x로 시작하는 64자리 16진수)
DID_ISSUER_PRIVATE_KEY=your_private_key_here

# 발급 API 보호용 시크릿 토큰
DID_ISSUE_API_KEY=your_service_api_key_here

# 백엔드 CORS 허용 도메인 (쉼표 구분)
DID_ALLOWED_ORIGINS=http://localhost:4000
DID_ISSUER_PRIVATE_KEY가 설정되지 않은 경우 서버가 시작되지 않습니다.

운영 환경(NODE_ENV=production)에서는 전체 VC 조회 API(GET /vc)가 비활성화됩니다.

2. 패키지 설치 및 서버 구동
Bash
# 의존성 설치
npm install

# 개발 모드 실행 (포트 5001)
npm run dev

# 프로덕션 실행
npm start
3. 무결성 및 보안 단위 테스트
Bash
npm test
VC 클레임(혈액형, 적격 여부, DID, 만료일 등) 위·변조 탐지 8종

API 계층 인증(x-api-key), 유효성 검사, 보안 격리 9종

API 규격서
기본 서버 주소: http://localhost:5001

1. 헬스체크
GET /health

Response (200 OK)

JSON
{
  "status": "ok",
  "module": "DID/VC Service",
  "issuerDid": "did:ethr:0x...",
  "port": 5001
}
2. 헌혈 적격 VC 발급
공인된 백엔드 시스템만 호출할 수 있습니다.

POST /vc/issue

Headers: x-api-key: {DID_ISSUE_API_KEY}

Request Body

JSON
{
  "holderAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "bloodType": "O",
  "isEligible": true,
  "lastDonationDate": "2026-08-01",
  "daysValid": 90
}
Response (201 Created): 발급된 W3C 규격 VC 객체 반환

3. VC 위변조 및 서명 검증
POST /vc/verify

Request Body

JSON
{
  "vc": { /* W3C VC 객체 */ }
}
Response (200 OK)

JSON
{
  "isValid": true,
  "verifiedData": {
    "issuer": "did:ethr:0x...",
    "holderDid": "did:ethr:0x...",
    "bloodType": "O",
    "isEligible": true,
    "lastDonationDate": "2026-08-01"
  }
}
4. 수혈 적격 후보자 매칭
POST /match

Request Body

JSON
{
  "bloodType": "O",
  "minDaysSinceLastDonation": 60,
  "onlyEligible": true
}
Response (200 OK)

JSON
{
  "success": true,
  "query": {
    "bloodType": "O",
    "minDaysSinceLastDonation": 60,
    "onlyEligible": true
  },
  "matchedCount": 1,
  "matches": [
    {
      "holderDid": "did:ethr:0x...",
      "bloodType": "O",
      "isEligible": true,
      "lastDonationDate": "2026-08-01",
      "issuerDid": "did:ethr:0x...",
      "verifiedSignature": true
    }
  ]
}
5. 전체 VC 조회 (개발 전용)
GET /vc

개발 모드(NODE_ENV=development)에서만 활성화되며, 운영 모드에서는 404 Not Found를 반환합니다.