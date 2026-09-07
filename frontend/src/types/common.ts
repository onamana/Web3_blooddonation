/** 백엔드 계약과 동일한 혈액형 타입 (backend/src/schemas/common.js 참고) */
export type BloodType = "A" | "B" | "AB" | "O";

/** 샘플 아트보드 기준 Rh 표기 */
export type RhType = "Rh+" | "Rh-";

/** 성분 종류 */
export type BloodComponent = "적혈구" | "혈장" | "혈소판";

export type BadgeVariant = "ok" | "fail" | "stored" | "disc";

export interface RequestState<T> {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  error?: string;
}
