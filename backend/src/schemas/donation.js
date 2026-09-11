import { z } from "zod";
import { ethAddressSchema, donationHashSchema } from "./common.js";

export const donationAuthBodySchema = z
  .strictObject({
    address: ethAddressSchema,
    message: z.string().min(1).meta({ example: "blood-donation-auth:1699999999" }),
    signature: z.string().min(1).meta({ example: "0x..." }),
  })
  .meta({ id: "DonationAuthRequest" });

export const donationAuthResponseSchema = z
  .object({
    donationHash: donationHashSchema,
    timestamp: z.number().int(),
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
  })
  .meta({ id: "DonationQueryResponse" });
