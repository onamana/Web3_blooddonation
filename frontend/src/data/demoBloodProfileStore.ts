import type { BloodType } from "../types/common";
import { DEMO_WALLET_ADDRESS } from "./demoWallet";

/**
 * 데모 전용 오프체인 혈액 검사정보.
 * 실제 서비스에서는 이 모듈 대신 접근 제어가 적용된 백엔드 DB를 사용한다.
 * 증서 객체에는 이 정보를 복사하지 않는다.
 */
export interface DemoBloodProfile {
  bloodType: BloodType;
  rh: "+" | "-";
  testedBy: string;
  testedAt: string;
}

const donorProfiles = new Map<string, DemoBloodProfile>([
  [
    DEMO_WALLET_ADDRESS.toLowerCase(),
    {
      bloodType: "A",
      rh: "+",
      testedBy: "대전혈액원",
      testedAt: "2026-09-10T09:00:00+09:00",
    },
  ],
]);

const certificateProfiles = new Map<string, DemoBloodProfile>([
  [
    "94",
    {
      bloodType: "A",
      rh: "+",
      testedBy: "대전혈액원",
      testedAt: "2026-05-12T09:30:00+09:00",
    },
  ],
  [
    "95",
    {
      bloodType: "O",
      rh: "+",
      testedBy: "대전혈액원",
      testedAt: "2026-07-03T13:20:00+09:00",
    },
  ],
  [
    "88",
    {
      bloodType: "B",
      rh: "+",
      testedBy: "충남혈액원",
      testedAt: "2026-03-11T10:50:00+09:00",
    },
  ],
]);

function clone(profile: DemoBloodProfile | undefined) {
  return profile ? { ...profile } : null;
}

export const demoBloodProfileStore = {
  getByWallet(walletAddress: string) {
    return clone(donorProfiles.get(walletAddress.toLowerCase()));
  },

  getByCertificate(tokenId: string) {
    return clone(certificateProfiles.get(tokenId));
  },

  linkCertificate(tokenId: string, profile: DemoBloodProfile) {
    certificateProfiles.set(tokenId, { ...profile });
  },
};
