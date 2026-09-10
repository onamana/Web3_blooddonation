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
  whole: "전혈헌혈",
  plasma: "혈장성분헌혈",
  platelet: "혈소판성분헌혈",
};

/** 컨트랙트에는 아직 없는 값이라, 없으면 가장 흔한 "전혈헌혈"로 표시한다. */
export function donationTypeLabel(donationType: DonationType | undefined) {
  return DONATION_TYPE_LABEL[donationType ?? "whole"];
}
