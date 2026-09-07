import type { BloodType, RhType } from "../types/common";
import type { SearchConditions } from "../types/hospital";
import { apiRequest } from "./client";
import { unknownMatchResponseSchema } from "./schemas";

export interface MatchConditionsPayload {
  bloodType?: BloodType;
  recentDonationWithinDays?: number;
  // B 모듈 스펙 확정 전까지 병원 화면의 나머지 조건도 함께 전달한다 (백엔드가 passthrough 처리).
  rh?: RhType;
  components?: SearchConditions["comps"];
  units?: number;
  region?: string;
  urgency?: SearchConditions["urgency"];
}

/**
 * POST /match — B(DID 모듈)로 조건을 중계하는 백엔드 라우트를 그대로 호출한다.
 *
 * TODO(어댑터 미완성): B 모듈의 실제 응답 스펙이 나오기 전까지는 응답 형태를 알 수 없다.
 * 여기서는 "성공하면 알 수 없는 JSON을 그대로 반환" 이상은 하지 않는다.
 * 스펙이 확정되면 features/hospital/matchAdapter.ts 에 raw → MatchResult[] 매핑을 추가할 것.
 */
export async function postMatch(conditions: MatchConditionsPayload): Promise<unknown> {
  const raw = await apiRequest<unknown>("/match", { method: "POST", body: conditions });
  return unknownMatchResponseSchema.parse(raw);
}
