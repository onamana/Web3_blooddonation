import { z } from 'zod';
import { ethers } from 'ethers';

export const credentialIssueSchema = z.object({
  holderAddress: z.string().refine(ethers.isAddress, '유효한 지갑 주소가 필요합니다.'),
  bloodType: z.enum(['A', 'B', 'AB', 'O']),
  isEligible: z.boolean(),
  lastDonationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getTime() <= Date.now();
  }, '오늘 이전의 실제 날짜를 입력하세요.'),
  daysValid: z.number().int().min(1).max(365).default(90),
}).strict().meta({ id: 'CredentialIssueRequest' });
export const credentialVerifySchema = z.object({ vc: z.record(z.string(), z.unknown()) }).strict();
export const credentialRevokeSchema = z.object({ id: z.string().startsWith('urn:uuid:').max(100) }).strict();
