import { levelFor, xpForLevel } from '../levels';

describe('levels', () => {
  it('needs 100 XP more for each level', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });

  it('places XP totals in their level', () => {
    expect(levelFor(0)).toEqual({ level: 1, intoLevel: 0, forNext: 100, progress: 0 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, intoLevel: 0, forNext: 200, progress: 0 });
    expect(levelFor(450)).toEqual({ level: 3, intoLevel: 150, forNext: 150, progress: 0.5 });
    expect(levelFor(-5).level).toBe(1);
  });
});
