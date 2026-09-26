import { newWeights } from '../sync';

const at = (min: number) => new Date(Date.UTC(2026, 8, 27, 8, min));

describe('newWeights', () => {
  it('keeps samples not already stored', () => {
    expect(
      newWeights(
        [
          { kg: 80.4, at: at(0) },
          { kg: 80.2, at: at(60) },
        ],
        [{ measured_at: at(1).toISOString(), weight_kg: 80.4 }],
      ),
    ).toEqual([{ kg: 80.2, at: at(60) }]);
  });

  it('skips duplicates within the batch and implausible values', () => {
    expect(
      newWeights(
        [
          { kg: 79.87654, at: at(0) },
          { kg: 79.9, at: at(1) },
          { kg: 5, at: at(10) },
        ],
        [],
      ),
    ).toEqual([{ kg: 79.88, at: at(0) }]);
  });

  it('treats a different weight at the same time as new', () => {
    expect(
      newWeights([{ kg: 81, at: at(0) }], [{ measured_at: at(0).toISOString(), weight_kg: 80.4 }]),
    ).toHaveLength(1);
  });
});
