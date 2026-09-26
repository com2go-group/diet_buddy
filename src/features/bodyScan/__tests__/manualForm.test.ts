import { validateTape } from '../components/ManualForm';

const base = { weightKg: 80, heightCm: 175, waistCm: null, neckCm: null, hipCm: null };

describe('validateTape', () => {
  it('accepts weight and height alone (tape is optional)', () => {
    expect(validateTape(base, 'metric')).toEqual({});
  });

  it('checks weight and height ranges', () => {
    expect(Object.keys(validateTape({ ...base, weightKg: 10, heightCm: null }, 'metric'))).toEqual([
      'weightKg',
      'heightCm',
    ]);
  });

  it('needs a waist larger than the neck when either is given', () => {
    expect(validateTape({ ...base, waistCm: 85 }, 'metric')).toHaveProperty('waistCm');
    expect(validateTape({ ...base, waistCm: 35, neckCm: 38 }, 'metric')).toHaveProperty('waistCm');
    expect(validateTape({ ...base, waistCm: 85, neckCm: 38 }, 'metric')).toEqual({});
  });

  it('shows limits in the user’s units', () => {
    expect(validateTape({ ...base, weightKg: 10 }, 'imperial').weightKg).toContain('lb');
  });
});
