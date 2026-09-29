import type { AiAllowance, AiLimits } from '../../functions/_shared/aiAllowance';

/** A fixed AI allowance for handler tests (defaults match the migration). */
export function fakeAllowance(
  opts: Partial<Omit<AiAllowance, 'limits'>> & { limits?: Partial<AiLimits> } = {},
) {
  const allowance: AiAllowance = {
    premium: false,
    spentUsd: 0,
    budgetUsd: 0.04,
    boosts: 0,
    boostsMax: 3,
    ...opts,
    limits: {
      coachFree: 3,
      coachPremium: 60,
      foodPhotoFree: 1,
      alternativesFree: 1,
      boostCoach: 3,
      boostFoodPhoto: 1,
      boostAlternatives: 1,
      ...opts.limits,
    },
  };
  return jest.fn(async () => allowance);
}
