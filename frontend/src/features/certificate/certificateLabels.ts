import type { BadgeVariant } from "../../types/common";
import type { Certificate } from "../../types/certificate";

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
