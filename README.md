# Web3 헌혈 이력 / 병원 매칭 시스템 (blockhack.kr)

## 아키텍처

```
D 프론트엔드          C 백엔드 (API + ethers.js)         A 스마트컨트랙트 (Sepolia)
헌혈자 화면      →     헌혈 인증 요청 처리          →     헌혈 이력 컨트랙트
(지갑 연결, 이력조회)                                    (record / verify / query)
                                                          해시만 온체인 기록
병원 매칭 화면    →     매칭 조건 중계               →     B DID 모듈
(조건 입력, 결과)                                        VC 보관 · 조건 필터링
                                                          (혈액형, 최근 헌혈일)
                                                          오프체인 · 익명 결과만 반환
```

**데이터 분리 원칙**
- 온체인: 익명 해시, 타임스탬프, 혈액형
- 오프체인: 실명, 연락처, 상세 신상정보
- 개인정보는 절대 온체인에 올리지 않음

## 담당

- A: 스마트컨트랙트 (헌혈 이력 컨트랙트, Sepolia 배포)
- B: DID 모듈 (VC 보관, 조건 필터링)
- C: 백엔드 (API 서버, ethers.js 연동, 서명 검증) — `backend/`
- D: 프론트엔드 (지갑 연결, 화면) — `frontend/`

## 백엔드 진행 순서

1. Node/Express 기본 서버 세팅
2. ethers.js로 컨트랙트 함수 호출 연습 (A 컨트랙트 배포 전엔 더미 ABI로)
3. 지갑 서명 검증 로직 단독 테스트 (MetaMask는 프론트 전용이므로, 프론트가 보낼 서명을 검증하는 쪽을 먼저 테스트)
4. A의 실제 컨트랙트 주소/ABI로 교체 + B(DID 모듈)와의 API 계약 연동

자세한 내용은 `backend/README.md` 참고.

## 프론트엔드 진행 순서

1. React + TypeScript + Vite 기본 프로젝트 세팅 (strict 모드, ESLint, CSS Modules)
2. `frontend/sample/*.html` 아트보드 기준으로 헌혈자 앱(`/donor`)·병원 콘솔(`/hospital`) 화면을 컴포넌트/상태로 재구현 (데모 목업 데이터 사용)
3. `window.ethereum` 기반 실제 지갑 연결(계정 요청, 계정 변경/연결 해제 이벤트, MetaMask 미설치 안내) 붙이기
4. `VITE_DEMO_MODE` 플래그로 데모 목업 ↔ 실제 백엔드(C) API(`/donation`, `/match`) 호출 전환 구조 마련, Zod로 응답 검증
5. A(스마트컨트랙트 ABI)·B(DID 모듈) 스펙이 확정되는 대로 남은 TODO(혈액형 uint8 매핑, 지갑별 이력 목록 API, `/match` 응답 매핑 어댑터) 교체

자세한 내용은 `frontend/README.md` 참고.
