import { z } from "zod";
import { bloodTypeSchema } from "./common.js";

// B(DID 모듈)의 정확한 스펙이 아직 없어서 알려진 필드만 검증하고,
// 나머지 필드는 통과시킴(passthrough). B 스펙 확정되면 여기에 필드 추가.
export const matchConditionsSchema = z
  .object({
    bloodType: bloodTypeSchema.optional(),
    recentDonationWithinDays: z.number().int().positive().optional(),
  })
  .passthrough()
  .meta({ id: "MatchConditions" });
