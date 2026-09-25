import type { Body } from './types';

export const BODY_LIMITS = {
  ageYears: { min: 18, max: 120 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 350 },
} as const;

/** Throws a RangeError for values outside physiological limits. Inputs are assumed metric. */
export function assertValidBody(body: Body): void {
  for (const key of ['ageYears', 'heightCm', 'weightKg'] as const) {
    const value = body[key];
    const { min, max } = BODY_LIMITS[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`${key} must be between ${min} and ${max}, got ${value}`);
    }
  }
}

export function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
}
