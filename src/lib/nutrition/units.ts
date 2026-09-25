const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

export type UnitSystem = 'metric' | 'imperial';

export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const cmToIn = (cm: number): number => cm / CM_PER_INCH;
export const inToCm = (inches: number): number => inches * CM_PER_INCH;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cmToIn(cm));
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export const feetInchesToCm = (feet: number, inches: number): number => inToCm(feet * 12 + inches);

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
