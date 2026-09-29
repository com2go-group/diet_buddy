import { careCheckDue, lowIntakeDays } from '../lowIntake';

const NOW = new Date(2026, 8, 30, 12);
const at = (daysAgo: number, hour: number) => new Date(2026, 8, 30 - daysAgo, hour).toISOString();
const day = (daysAgo: number, kcal: number[], slots = ['breakfast', 'lunch', 'dinner']) =>
  kcal.map((c, i) => ({ logged_at: at(daysAgo, 8 + i * 4), meal_slot: slots[i]!, calories: c }));

describe('lowIntakeDays', () => {
  it('counts fairly complete days far below the target', () => {
    const logs = [
      ...day(1, [200, 300, 300]), // 800 < 1,080 (60 % of 1,800)
      ...day(2, [300, 300]),
      ...day(3, [500, 700, 600]), // fine
      ...day(4, [400]), // one meal only: not counted
    ];
    expect(lowIntakeDays(logs, 1800, NOW)).toBe(2);
  });

  it('ignores today and days older than a week', () => {
    const logs = [...day(0, [100, 100]), ...day(8, [100, 100])];
    expect(lowIntakeDays(logs, 1800, NOW)).toBe(0);
  });

  it('needs a target', () => {
    expect(lowIntakeDays(day(1, [100, 100]), 0, NOW)).toBe(0);
  });
});

describe('careCheckDue', () => {
  it('shows after 3 low days, and again a week after being closed', () => {
    expect(careCheckDue(2, undefined, NOW)).toBe(false);
    expect(careCheckDue(3, undefined, NOW)).toBe(true);
    expect(careCheckDue(3, new Date(2026, 8, 27).toISOString(), NOW)).toBe(false);
    expect(careCheckDue(3, new Date(2026, 8, 22).toISOString(), NOW)).toBe(true);
  });
});
