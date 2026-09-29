import {
  allowanceFrom,
  clientDay,
  nextBoost,
  overBudget,
} from '../../functions/_shared/aiAllowance';

const at = (headers: Record<string, string>) =>
  new Request('http://x', { method: 'POST', headers });

describe('clientDay', () => {
  const now = new Date('2026-09-29T23:30:00Z');

  it('uses the device time zone for the local date and the start of the day', () => {
    // Athens (UTC+3): getTimezoneOffset() is -180, and it's already 30 September.
    const day = clientDay(at({ 'x-client-tz-offset': '-180' }), now);
    expect(day.localDate).toBe('2026-09-30');
    expect(day.dayStart.toISOString()).toBe('2026-09-29T21:00:00.000Z');
    expect(day.web).toBe(false);
  });

  it('falls back to UTC (or the given offset) for missing or invalid headers', () => {
    expect(clientDay(at({}), now).localDate).toBe('2026-09-29');
    expect(clientDay(at({ 'x-client-tz-offset': 'lots' }), now, -180).localDate).toBe('2026-09-30');
    expect(clientDay(at({ 'x-client-tz-offset': '5000' }), now).localDate).toBe('2026-09-29');
  });

  it('knows the web build, which has no ads', () => {
    expect(clientDay(at({ 'x-client-platform': 'web' }), now).web).toBe(true);
  });
});

describe('allowance', () => {
  const day = { dayStart: new Date(), localDate: '2026-09-29', web: false };

  it('reads the database answer with safe defaults', () => {
    const a = allowanceFrom({ premium: false, spent_usd: '0.004', boosts: 1, limits: {} });
    expect(a.spentUsd).toBe(0.004);
    expect(a.budgetUsd).toBe(0.04);
    expect(a.limits.coachFree).toBe(3);
  });

  it('offers the next video until the daily maximum, never on the web or to Premium', () => {
    const a = allowanceFrom({ boosts: 1, boosts_max: 3 });
    expect(nextBoost(a, day)).toBe('2026-09-29:2');
    expect(nextBoost({ ...a, boosts: 3 }, day)).toBeNull();
    expect(nextBoost(a, { ...day, web: true })).toBeNull();
    expect(nextBoost({ ...a, premium: true }, day)).toBeNull();
  });

  it('applies the budget to free users only', () => {
    const a = allowanceFrom({ spent_usd: 0.02, budget_usd: 0.012 });
    expect(overBudget(a)).toBe(true);
    expect(overBudget({ ...a, premium: true })).toBe(false);
  });
});
