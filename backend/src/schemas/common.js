import { z } from "zod";

export const ethAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "이더리움 주소 형식(0x + 40자리 hex)이 아닙니다")
  .meta({ example: "0x3C28f4599757b82F133CEb9a64dEfeEd98cE6E83", description: "이더리움 지갑 주소" });

export const donationHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "keccak256 해시 형식(0x + 64자리 hex)이 아닙니다")
  .meta({ example: `0x${"ab".repeat(32)}`, description: "keccak256 해시 (32바이트)" });

export const bloodTypeSchema = z.enum(["A", "B", "AB", "O"]).meta({ description: "혈액형" });

export const errorResponseSchema = z
  .object({
    error: z.string(),
    detail: z.string().optional(),
  })
  .meta({ id: "ErrorResponse" });
