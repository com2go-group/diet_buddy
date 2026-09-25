import { bmr, tdee } from '../energy';
import type { Body } from '../types';

const male: Body = { sex: 'male', ageYears: 30, heightCm: 180, weightKg: 90 };

describe('bmr (Mifflin-St Jeor)', () => {
  it('uses the male equation', () => {
    // 10·90 + 6.25·180 − 5·30 + 5
    expect(bmr(male)).toBe(1880);
  });

  it('uses the female equation', () => {
    // 10·60 + 6.25·165 − 5·28 − 161
    expect(bmr({ sex: 'female', ageYears: 28, heightCm: 165, weightKg: 60 })).toBeCloseTo(1330.25);
  });

  it('averages both equations for unspecified sex', () => {
    const m = bmr({ ...male, sex: 'male' });
    const f = bmr({ ...male, sex: 'female' });
    expect(bmr({ ...male, sex: 'unspecified' })).toBeCloseTo((m + f) / 2);
  });

  it.each([
    ['ageYears', 17],
    ['ageYears', Number.NaN],
    ['heightCm', 0],
    ['weightKg', -5],
    ['weightKg', 1000],
  ] as const)('rejects out-of-range %s = %p', (key, value) => {
    expect(() => bmr({ ...male, [key]: value })).toThrow(RangeError);
  });
});

describe('tdee', () => {
  it.each([
    ['sedentary', 1.2],
    ['lightly_active', 1.375],
    ['active', 1.55],
    ['very_active', 1.725],
  ] as const)('%s multiplies BMR by %p', (level, multiplier) => {
    expect(tdee(male, level)).toBeCloseTo(1880 * multiplier);
  });
});
