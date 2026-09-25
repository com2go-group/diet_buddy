import { BMI_OBESE, BMI_OVERWEIGHT, BMI_UNDERWEIGHT } from './constants';
import type { BmiCategory } from './types';
import { assertPositive } from './validation';

export function bmi(weightKg: number, heightCm: number): number {
  assertPositive('weightKg', weightKg);
  assertPositive('heightCm', heightCm);
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): BmiCategory {
  if (value < BMI_UNDERWEIGHT) return 'underweight';
  if (value < BMI_OVERWEIGHT) return 'normal';
  if (value < BMI_OBESE) return 'overweight';
  return 'obese';
}

/** Body weight that gives the target BMI at this height. */
export function weightForBmi(targetBmi: number, heightCm: number): number {
  assertPositive('targetBmi', targetBmi);
  assertPositive('heightCm', heightCm);
  const m = heightCm / 100;
  return targetBmi * m * m;
}
