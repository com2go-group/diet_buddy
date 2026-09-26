import { bmr } from '@/lib/nutrition';

import { parseEdit, scanResults, type ScanInputs } from '../results';

const inputs: ScanInputs = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 90,
  activity: 'active',
  waistCm: null,
  neckCm: null,
  hipCm: null,
};

describe('scanResults', () => {
  it('uses the BMI-based estimate without tape measurements', () => {
    const r = scanResults(inputs);
    expect(r.method).toBe('bmi');
    // Deurenberg: 1.2 × 27.78 + 0.23 × 30 − 10.8 − 5.4
    expect(r.values.bodyFat).toBeCloseTo(24.03, 1);
    expect(r.values.fatMass).toBeCloseTo(90 * 0.2403, 1);
    expect(r.values.leanMass + r.values.fatMass).toBeCloseTo(90);
    expect(r.values.bmr).toBe(1880);
    expect(r.values.tdee).toBeCloseTo(2914);
    expect(r.values.bmi).toBeCloseTo(27.78, 2);
  });

  it('prefers the Navy tape method when waist and neck are given', () => {
    const r = scanResults({ ...inputs, waistCm: 90, neckCm: 40 });
    expect(r.method).toBe('navy');
    expect(r.values.bodyFat).toBeCloseTo(18.37, 1);
  });

  it('falls back to the BMI estimate when the tape method can’t apply', () => {
    const r = scanResults({ ...inputs, sex: 'female', waistCm: 80, neckCm: 33 });
    expect(r.method).toBe('bmi');
  });

  it('lets edited values override and flows them into dependent values', () => {
    const r = scanResults(inputs, { bodyFat: 20, bmr: 2000 });
    expect(r.method).toBe('user');
    expect(r.values.fatMass).toBe(18);
    expect(r.values.leanMass).toBe(72);
    expect(r.values.tdee).toBeCloseTo(3100);
    expect(r.overridden).toMatchObject({ bodyFat: true, bmr: true, tdee: false, fatMass: false });
  });

  it('keeps an edited value even when its inputs change', () => {
    const r = scanResults(inputs, { tdee: 2500, fatMass: 15 });
    expect(r.values.tdee).toBe(2500);
    expect(r.values.fatMass).toBe(15);
    expect(r.values.leanMass).toBe(75);
    expect(r.values.bmr).toBe(bmr(inputs));
  });
});

describe('parseEdit', () => {
  it('rounds to the metric’s precision', () => {
    expect(parseEdit('bodyFat', 21.46)).toEqual({ value: 21.5 });
    expect(parseEdit('bmr', 1799.6)).toEqual({ value: 1800 });
  });

  it('rejects values outside the allowed range', () => {
    expect(parseEdit('bodyFat', 2)).toEqual({ error: true });
    expect(parseEdit('tdee', 900)).toEqual({ error: true });
    expect(parseEdit('bmi', null)).toEqual({ error: true });
  });
});
