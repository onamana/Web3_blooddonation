export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

/**
 * true면 화면은 인메모리 목업 증서 데이터를 사용한다(`src/data/certificateStore.ts`).
 * false면 실제 백엔드 `/certificate` 를 호출한다.
 * 기본값은 true — 아직 증서 컨트랙트가 배포되지 않았기 때문.
 */
const RUNTIME_DEMO_MODE_KEY = "bloodpass.runtimeDemoMode";
export const LIVE_CONTRACT_MODE = import.meta.env.VITE_DEMO_MODE === "false";

/** 실제 컨트랙트 모드에서도 MetaMask가 없는 사용자가 데모를 둘러볼 수 있게 하는 임시 세션이다. */
export const RUNTIME_DEMO_MODE =
  typeof window !== "undefined" && window.sessionStorage.getItem(RUNTIME_DEMO_MODE_KEY) === "true";

export const DEMO_MODE = !LIVE_CONTRACT_MODE || RUNTIME_DEMO_MODE;

export function startRuntimeDemoMode(): void {
  window.sessionStorage.setItem(RUNTIME_DEMO_MODE_KEY, "true");
}

export function stopRuntimeDemoMode(): void {
  window.sessionStorage.removeItem(RUNTIME_DEMO_MODE_KEY);
}

/** 트랜잭션 해시를 확인할 블록 익스플로러. 컨트랙트는 Sepolia에 배포된다. */
export const EXPLORER_BASE_URL =
  import.meta.env.VITE_EXPLORER_BASE_URL ?? "https://sepolia.etherscan.io";

/**
 * BloodCertificate(ERC-721) 컨트랙트 주소. 양도는 백엔드 릴레이가 아니라 소유자의
 * MetaMask가 직접 safeTransferFrom()을 호출하므로 프론트가 이 주소를 알아야 한다.
 */
export const CERTIFICATE_CONTRACT_ADDRESS = import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS || "";
export const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || "0xaa36a7";
export const NETWORK_NAME = CHAIN_ID === '0x7a69' ? 'Local Demo' : 'Sepolia';

/**
 * 데모 모드에서 발급 화면이 쓰는 발급기관 명.
 * 실제 API 모드에서는 백엔드(BLOOD_CENTER_NAME)가 정하므로 요청에 담지 않는다.
 * 프론트의 HOSPITAL_NAME과 같은 처지 — 다중 혈액원 지원은 MVP 스코프 밖이다.
 */
export const DEMO_BLOOD_CENTER_NAME = "대전혈액원";
