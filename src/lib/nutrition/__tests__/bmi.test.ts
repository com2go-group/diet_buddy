import { bmi, bmiCategory, weightForBmi } from '../bmi';

describe('bmi', () => {
  it('computes kg/m²', () => {
    expect(bmi(90, 180)).toBeCloseTo(27.78, 2);
  });

  it.each([
    [18.4, 'underweight'],
    [18.5, 'normal'],
    [24.99, 'normal'],
    [25, 'overweight'],
    [29.99, 'overweight'],
    [30, 'obese'],
  ] as const)('classifies %p as %s', (value, category) => {
    expect(bmiCategory(value)).toBe(category);
  });

  it('inverts to a weight for a target BMI', () => {
    expect(weightForBmi(25, 180)).toBeCloseTo(81);
    expect(bmi(weightForBmi(22, 163), 163)).toBeCloseTo(22);
  });

  it('rejects non-positive inputs', () => {
    expect(() => bmi(0, 180)).toThrow(RangeError);
    expect(() => bmi(80, 0)).toThrow(RangeError);
  });
});
