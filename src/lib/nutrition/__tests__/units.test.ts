import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, roundTo } from '../units';

describe('units', () => {
  it('converts weight', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3);
    expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5);
  });

  it('converts height', () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88);
  });

  it('rounds to decimals', () => {
    expect(roundTo(27.777, 1)).toBe(27.8);
  });
});
