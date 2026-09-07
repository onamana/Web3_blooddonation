import type { BadgeVariant, BloodComponent } from "./common";

export interface WalletInfo {
  /** 화면에는 항상 축약해서만 노출 (0x1234…abcd) */
  address: string;
  /**
   * 데모용으로 지갑 주소에서 파생한 익명 ID.
   * 실제 DID API가 아직 없어 임시로 만든 값이므로 실제 DID/VC 값이 아니다.
   */
  demoDonorId: string;
}

export interface JourneyStep {
  name: string;
  time: string;
  org: string;
  hash: string;
  block: string;
  fields: string[];
  note?: string;
}

export interface DonationBranch {
  code: string;
  comp: BloodComponent;
  color: string;
  status: string;
  statusVariant: BadgeVariant;
  steps: JourneyStep[];
}

export interface Donation {
  id: string;
  date: string;
  volume: number;
  place: string;
  stage: string;
  root: JourneyStep;
  test: JourneyStep;
  branches: DonationBranch[];
}

export interface DonationSummary {
  count: number;
  volume: string;
  lastDate: string;
  lastPlace: string;
  nextDday: string;
  patients: number;
  patientTip: string;
  region: string;
}

/** 위변조 시뮬레이션 대상 노드 지정 */
export interface TamperTarget {
  donationId: string;
  comp: BloodComponent;
  step: string;
}

/** 헌혈 여정 노드를 식별하는 키. root/test/branch 단계 구분용 */
export type JourneyNodeKey = "root" | "test" | `b${number}-${number}`;
