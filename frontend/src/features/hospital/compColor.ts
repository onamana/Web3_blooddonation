import { COLOR } from "../../data/hospitalMock";
import type { BloodComponent } from "../../types/common";

export function compColor(comp: BloodComponent): string {
  if (comp === "적혈구") return COLOR.rbc;
  if (comp === "혈장") return COLOR.pls;
  return COLOR.plt;
}
