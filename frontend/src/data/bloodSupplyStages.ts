/** 혈액 수급 위기대응 단계(관심·주의·경계·심각)를 본뜬 보유일수 기준. */
export type SupplyStageKey = "stable" | "watch" | "caution" | "alert" | "critical";

export interface SupplyStage {
  key: SupplyStageKey;
  label: string;
}

const THRESHOLDS: { min: number; key: SupplyStageKey; label: string }[] = [
  { min: 5, key: "stable", label: "안정" },
  { min: 3, key: "watch", label: "관심" },
  { min: 2, key: "caution", label: "주의" },
  { min: 1, key: "alert", label: "경계" },
  { min: -Infinity, key: "critical", label: "심각" },
];

export function getSupplyStage(days: number): SupplyStage {
  const found = THRESHOLDS.find((t) => days >= t.min);
  return found ?? THRESHOLDS[THRESHOLDS.length - 1]!;
}
