import { ACTIVITY_MULTIPLIERS } from './constants';
import type { ActivityLevel, Body } from './types';
import { assertValidBody } from './validation';

/**
 * Basal metabolic rate, Mifflin-St Jeor (kcal/day).
 *   male:   10w + 6.25h − 5a + 5
 *   female: 10w + 6.25h − 5a − 161
 * 'unspecified' (other / prefer not to say) uses the average of the two, i.e. a −78 constant.
 * Decision log 2026-09-25.
 */
export function bmr({ sex, ageYears, heightCm, weightKg }: Body): number {
  assertValidBody({ sex, ageYears, heightCm, weightKg });
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const offset = sex === 'male' ? 5 : sex === 'female' ? -161 : (5 - 161) / 2;
  return base + offset;
}

/** Total daily energy expenditure = BMR × activity multiplier (kcal/day). */
export function tdee(body: Body, activity: ActivityLevel): number {
  return bmr(body) * ACTIVITY_MULTIPLIERS[activity];
}
