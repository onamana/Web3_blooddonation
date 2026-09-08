import { EXPLORER_BASE_URL } from "../api/env";

export function txUrl(txHash: string) {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

/** 온체인 타임스탬프(unix seconds) → 2026-05-12 */
export function formatOnchainDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("sv-SE");
}

/** 온체인 타임스탬프(unix seconds) → 2026-05-12 10:24 */
export function formatOnchainDateTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortenTxHash(txHash: string) {
  return `${txHash.slice(0, 8)}…${txHash.slice(-4)}`;
}
