export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

/**
 * true면 화면은 인메모리 목업 증서 데이터를 사용한다(`src/data/certificateStore.ts`).
 * false면 실제 백엔드 `/certificate` 를 호출한다.
 * 기본값은 true — 아직 증서 컨트랙트가 배포되지 않았기 때문.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";

/** 트랜잭션 해시를 확인할 블록 익스플로러. 컨트랙트는 Sepolia에 배포된다. */
export const EXPLORER_BASE_URL =
  import.meta.env.VITE_EXPLORER_BASE_URL || "https://sepolia.etherscan.io";

/**
 * 데모 모드에서 발급 화면이 쓰는 발급기관 명.
 * 실제 API 모드에서는 백엔드(BLOOD_CENTER_NAME)가 정하므로 요청에 담지 않는다.
 * 프론트의 HOSPITAL_NAME과 같은 처지 — 다중 혈액원 지원은 MVP 스코프 밖이다.
 */
export const DEMO_BLOOD_CENTER_NAME = "대전혈액원";
