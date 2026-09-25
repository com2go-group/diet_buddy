import {
  estimateBodyFatPct,
  estimateCompositionBreakdown,
  fatMassKg,
  leanMassKg,
  roundToTotal,
} from '../bodyComposition';

describe('estimateBodyFatPct (Deurenberg)', () => {
  // 180 cm × 81 kg gives BMI 25.
  const base = { ageYears: 30, heightCm: 180, weightKg: 81 };

  it('matches the male formula', () => {
    // 1.2·25 + 0.23·30 − 10.8 − 5.4
    expect(estimateBodyFatPct({ ...base, sex: 'male' })).toBeCloseTo(20.7);
  });

  it('matches the female formula', () => {
    expect(estimateBodyFatPct({ ...base, sex: 'female' })).toBeCloseTo(31.5);
  });

  it('uses the midpoint for unspecified sex', () => {
    expect(estimateBodyFatPct({ ...base, sex: 'unspecified' })).toBeCloseTo(26.1);
  });

  it('clamps to a plausible range', () => {
    expect(estimateBodyFatPct({ sex: 'female', ageYears: 110, heightCm: 150, weightKg: 300 })).toBe(
      60,
    );
  });
});

describe('fat and lean mass', () => {
  it('splits body weight', () => {
    expect(fatMassKg(80, 25)).toBe(20);
    expect(leanMassKg(80, 25)).toBe(60);
  });
});

describe('roundToTotal', () => {
  it('keeps the total exact', () => {
    expect(roundToTotal([33.3, 33.3, 33.4], 100)).toEqual([33, 33, 34]);
    expect(roundToTotal([27.47, 42.39, 30.14], 100)).toEqual([28, 42, 30]);
  });

  it('breaks ties toward earlier items', () => {
    expect(roundToTotal([50.5, 49.5], 100)).toEqual([51, 49]);
  });
});

describe('estimateCompositionBreakdown', () => {
  it.each([0, 12.3, 24.2, 47.9, 100])('sums to 100 for %p %% fat', (fat) => {
    const b = estimateCompositionBreakdown(fat);
    expect(b.fatPct + b.musclePct + b.waterPct + b.bonePct).toBe(100);
  });

  it('keeps fat close to the input', () => {
    expect(estimateCompositionBreakdown(24.2).fatPct).toBe(24);
  });
});
