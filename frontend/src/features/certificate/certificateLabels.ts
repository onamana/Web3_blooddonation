import type { BadgeVariant } from "../../types/common";
import type { Certificate, DonationType } from "../../types/certificate";

/** tokenId 94 → 증서 #094 */
export function formatTokenId(tokenId: string) {
  return `증서 #${tokenId.padStart(3, "0")}`;
}

export function statusLabel(status: Certificate["status"]) {
  return status === "used" ? "사용됨" : "사용 가능";
}

export function statusVariant(status: Certificate["status"]): BadgeVariant {
  return status === "used" ? "disc" : "ok";
}

const DONATION_TYPE_LABEL: Record<DonationType, string> = {
  whole: "전혈",
  plasma: "혈장성분헌혈",
  platelet: "혈소판성분헌혈",
  platelet_plasma: "혈소판혈장성분헌혈",
};

/** 실제 기록이 있는 경우에만 종류와 전혈 용량을 표시한다. */
export function donationTypeLabel(donationType: DonationType | undefined, volume?: 320 | 400) {
  if (!donationType) return "헌혈 종류 미등록";
  return DONATION_TYPE_LABEL[donationType] + (donationType === "whole" && volume ? ` (${volume}ml)` : "");
}
