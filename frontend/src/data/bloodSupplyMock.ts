/**
 * 초기 화면에 노출하는 혈액 보유 현황 데모 데이터.
 * 대한적십자사 혈액관리본부가 공개하는 통계 형식을 본떴을 뿐, 실제 재고와는 무관하다.
 */
import type { BloodType } from "../types/common";

export type BloodComponent = "rbc" | "platelet";

export interface BloodSupplyEntry {
  bloodType: BloodType;
  /** 보유량 (일분) */
  days: number;
}

export interface BloodSupplySnapshot {
  /** 기준 일자 (YYYY-MM-DD) */
  asOf: string;
  /** 4개 혈액형 평균 보유일수 */
  average: number;
  entries: BloodSupplyEntry[];
}

export const BLOOD_SUPPLY_MOCK: Record<BloodComponent, BloodSupplySnapshot> = {
  rbc: {
    asOf: "2026-09-08",
    average: 4.2,
    entries: [
      { bloodType: "A", days: 3.0 },
      { bloodType: "B", days: 6.3 },
      { bloodType: "O", days: 3.9 },
      { bloodType: "AB", days: 3.7 },
    ],
  },
  platelet: {
    asOf: "2026-09-08",
    average: 2.3,
    entries: [
      { bloodType: "A", days: 4.2 },
      { bloodType: "B", days: 1.8 },
      { bloodType: "O", days: 0.6 },
      { bloodType: "AB", days: 2.4 },
    ],
  },
};
