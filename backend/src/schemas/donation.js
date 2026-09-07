import { z } from "zod";
import { ethAddressSchema, donationHashSchema, bloodTypeSchema } from "./common.js";

export const donationAuthBodySchema = z
  .object({
    address: ethAddressSchema,
    message: z.string().min(1).meta({ example: "blood-donation-auth:1699999999" }),
    signature: z.string().min(1).meta({ example: "0x..." }),
    bloodType: bloodTypeSchema,
  })
  .meta({ id: "DonationAuthRequest" });

export const donationAuthResponseSchema = z
  .object({
    donationHash: donationHashSchema,
    timestamp: z.number().int(),
    bloodType: bloodTypeSchema,
    txHash: z.string().optional(),
  })
  .meta({ id: "DonationAuthResponse" });

export const donationHashParamSchema = z
  .object({
    hash: donationHashSchema,
  })
  .meta({ id: "DonationHashParam" });

export const donationVerifyResponseSchema = z
  .object({
    donationHash: donationHashSchema,
    verified: z.boolean(),
  })
  .meta({ id: "DonationVerifyResponse" });

export const donationQueryResponseSchema = z
  .object({
    donationHash: donationHashSchema,
    timestamp: z.number().int(),
    bloodType: z.union([z.number(), z.string()]),
  })
  .meta({ id: "DonationQueryResponse" });
