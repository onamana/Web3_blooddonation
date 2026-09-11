import { z } from "zod";
import { bloodTypeSchema } from "./common.js";

export const matchConditionsSchema = z
  .object({
    bloodType: bloodTypeSchema.optional(),
    minDaysSinceLastDonation: z.number().int().min(0).max(36500).default(60),
    onlyEligible: z.boolean().default(true),
  })
  .strict()
  .meta({ id: "MatchConditions" });
