import { addDays, dayKey, parseDayKey, startOfDay, weekdayKey } from '../dates';

describe('dates', () => {
  it('works in local time', () => {
    const d = new Date(2026, 0, 31, 23, 30);
    expect(dayKey(d)).toBe('2026-01-31');
    expect(dayKey(addDays(d, 1))).toBe('2026-02-01');
    expect(startOfDay(d)).toEqual(new Date(2026, 0, 31));
    expect(weekdayKey(new Date(2026, 8, 26))).toBe('sat');
  });
});

describe('parseDayKey', () => {
  it('parses valid local dates and rejects the rest', () => {
    const d = parseDayKey('2026-09-26')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 26, 0]);
    expect(parseDayKey('2026-02-30')).toBeNull();
    expect(parseDayKey('26/09/2026')).toBeNull();
    expect(parseDayKey(undefined)).toBeNull();
  });
});
