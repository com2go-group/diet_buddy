import { addDays, dayKey, startOfDay, weekdayKey } from '../dates';

describe('dates', () => {
  it('works in local time', () => {
    const d = new Date(2026, 0, 31, 23, 30);
    expect(dayKey(d)).toBe('2026-01-31');
    expect(dayKey(addDays(d, 1))).toBe('2026-02-01');
    expect(startOfDay(d)).toEqual(new Date(2026, 0, 31));
    expect(weekdayKey(new Date(2026, 8, 26))).toBe('sat');
  });
});
