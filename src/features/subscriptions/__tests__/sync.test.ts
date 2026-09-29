import { trialEnd } from '@/lib/purchases';

import { trialReminderTime } from '../sync';

const NOW = new Date('2026-09-29T10:00:00Z');
const DAY = 86_400_000;

describe('trial reminder', () => {
  it('reminds 2 days before a 7-day trial ends', () => {
    const end = new Date(NOW.getTime() + 7 * DAY);
    expect(trialReminderTime(end, NOW)).toEqual(new Date(end.getTime() - 2 * DAY));
  });

  it('reminds halfway through a short trial (sandbox minutes, or a late install)', () => {
    const end = new Date(NOW.getTime() + 60 * 60_000);
    expect(trialReminderTime(end, NOW)).toEqual(new Date(NOW.getTime() + 30 * 60_000));
  });

  it('has nothing to remind without a trial or after it ended', () => {
    expect(trialReminderTime(null, NOW)).toBeNull();
    expect(trialReminderTime(new Date(NOW.getTime() - 1), NOW)).toBeNull();
  });
});

describe('trialEnd', () => {
  const info = (premium: Record<string, unknown> | undefined) =>
    ({ entitlements: { active: premium ? { premium } : {} } }) as unknown as Parameters<
      typeof trialEnd
    >[0];

  it('reads a renewing trial', () => {
    expect(
      trialEnd(
        info({ periodType: 'TRIAL', expirationDate: '2026-10-06T10:00:00Z', willRenew: true }),
      ),
    ).toEqual(new Date('2026-10-06T10:00:00Z'));
  });

  it('ignores paid periods, cancelled trials and no Premium', () => {
    expect(
      trialEnd(info({ periodType: 'NORMAL', expirationDate: '2026-10-06', willRenew: true })),
    ).toBeNull();
    expect(
      trialEnd(info({ periodType: 'TRIAL', expirationDate: '2026-10-06', willRenew: false })),
    ).toBeNull();
    expect(trialEnd(info(undefined))).toBeNull();
  });
});
