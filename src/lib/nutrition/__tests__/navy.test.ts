import { navyBodyFatPct } from '../bodyComposition';

describe('navyBodyFatPct (U.S. Navy tape method)', () => {
  it('matches the male formula', () => {
    expect(navyBodyFatPct('male', 180, { waistCm: 90, neckCm: 40 })).toBeCloseTo(18.37, 1);
  });

  it('matches the female formula (needs hips)', () => {
    expect(navyBodyFatPct('female', 165, { waistCm: 75, neckCm: 33, hipCm: 100 })).toBeCloseTo(
      29.43,
      1,
    );
    expect(navyBodyFatPct('female', 165, { waistCm: 75, neckCm: 33 })).toBeNull();
  });

  it('averages both formulas for unspecified sex when hips are given', () => {
    expect(navyBodyFatPct('unspecified', 165, { waistCm: 75, neckCm: 33, hipCm: 100 })).toBeCloseTo(
      22.01,
      1,
    );
    expect(navyBodyFatPct('unspecified', 165, { waistCm: 75, neckCm: 33 })).toBeNull();
  });

  it('rejects impossible measurements instead of returning nonsense', () => {
    expect(navyBodyFatPct('male', 180, { waistCm: 40, neckCm: 40 })).toBeNull();
    expect(navyBodyFatPct('male', 180, { waistCm: 30, neckCm: 40 })).toBeNull();
    expect(navyBodyFatPct('male', 0, { waistCm: 90, neckCm: 40 })).toBeNull();
  });

  it('clamps to 3–60 %', () => {
    expect(navyBodyFatPct('male', 150, { waistCm: 200, neckCm: 30 })).toBe(60);
    expect(navyBodyFatPct('male', 200, { waistCm: 60, neckCm: 50 })).toBe(3);
  });
});
