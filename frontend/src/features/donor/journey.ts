import { TAMPER_TARGET } from "../../data/donorMock";
import type { Donation, DonationBranch, JourneyNodeKey, JourneyStep } from "../../types/donor";

export function isBadStep(donation: Donation, branch: DonationBranch, step: JourneyStep, tampered: boolean): boolean {
  return (
    tampered &&
    donation.id === TAMPER_TARGET.donationId &&
    branch.comp === TAMPER_TARGET.comp &&
    step.name === TAMPER_TARGET.step
  );
}

export function donationHasFailure(donation: Donation, tampered: boolean): boolean {
  if (!tampered || donation.id !== TAMPER_TARGET.donationId) return false;
  return donation.branches.some((b) => b.steps.some((s) => isBadStep(donation, b, s, tampered)));
}

const BRANCH_KEY_RE = /^b(\d+)-(\d+)$/;

export function stepByKey(
  donation: Donation,
  key: JourneyNodeKey,
  tampered: boolean,
): { step: JourneyStep; ok: boolean } | null {
  if (key === "root") return { step: donation.root, ok: true };
  if (key === "test") return { step: donation.test, ok: true };

  const match = BRANCH_KEY_RE.exec(key);
  if (!match) return null;
  const branch = donation.branches[Number(match[1])];
  if (!branch) return null;
  const step = branch.steps[Number(match[2])];
  if (!step) return null;
  return { step, ok: !isBadStep(donation, branch, step, tampered) };
}
