import { EMPTY_MANUAL, validateManual } from '../manual';

describe('validateManual', () => {
  it('requires a name and calories', () => {
    const result = validateManual(EMPTY_MANUAL);
    expect(result).toEqual({
      ok: false,
      errors: { name: 'authErrors.required', calories: 'authErrors.required' },
    });
  });

  it('accepts a label entry with optional fields empty', () => {
    const result = validateManual({
      ...EMPTY_MANUAL,
      name: ' Protein bar ',
      calories: 210,
      proteinG: 20,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Protein bar',
        quantity: null,
        unit: '',
        calories: 210,
        proteinG: 20,
        carbsG: null,
        fatG: null,
      },
    });
  });

  it('reports out-of-range numbers', () => {
    const result = validateManual({ ...EMPTY_MANUAL, name: 'x', calories: 20000, fatG: -1 });
    expect(result).toEqual({
      ok: false,
      errors: { calories: 'range:0:10000', fatG: 'range:0:1000' },
    });
  });
});
