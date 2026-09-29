import { coachTip, tipTime, type TipDay } from '../coachTip';

const day: TipDay = {
  proteinG: 110,
  waterMl: 2000,
  checkedIn: true,
  loggedAnything: true,
  targets: { proteinG: 130, waterMl: 2500 },
};

describe('coachTip', () => {
  it('nudges protein first when a lot is left', () => {
    const tip = coachTip({ ...day, proteinG: 60 });
    expect(tip?.persona).toBe('aria');
    expect(tip?.body).toContain('about 70 g of protein');
  });

  it('then water, then the check-in, then logging', () => {
    expect(coachTip({ ...day, waterMl: 750 })?.persona).toBe('max');
    expect(coachTip({ ...day, checkedIn: false })?.body).toContain('check-in');
    expect(coachTip({ ...day, proteinG: 0, loggedAnything: false })?.body).toContain(
      'Log what you’ve eaten',
    );
  });

  it('praises an on-track day and never tells anyone to eat less', () => {
    const tip = coachTip(day);
    expect(tip?.body).toContain('Nice work');
    for (const d of [day, { ...day, proteinG: 0 }, { ...day, waterMl: 0 }]) {
      expect(coachTip(d)?.body).not.toMatch(/eat less|cut|skip/i);
    }
  });

  it('has no tip without a plan', () => {
    expect(coachTip({ ...day, targets: null })).toBeNull();
  });

  it('is scheduled for 17:30 today, not once that has passed', () => {
    expect(tipTime(new Date('2026-09-29T09:00:00'))).toEqual(new Date('2026-09-29T17:30:00'));
    expect(tipTime(new Date('2026-09-29T18:00:00'))).toBeNull();
  });
});
