export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

/**
 * true면 화면은 frontend/sample 기준 목업 데이터를 사용한다.
 * false면 실제 백엔드(/donation, /match)를 호출한다.
 * 기본값은 true — 아직 스마트컨트랙트/DID 모듈이 배포되지 않았기 때문.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
