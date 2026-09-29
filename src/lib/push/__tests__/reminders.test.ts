import {
  DEFAULT_MEAL_TIMES,
  planReminders,
  routeFor,
  usualMealTimes,
  waterPace,
  type ReminderInput,
} from '../reminders';

const at = (day: number, h: number, m = 0) => new Date(2026, 8, day, h, m);
const allOn = { meal_reminders: true, checkin_reminder: true, water_reminders: true };
const input = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  now: at(30, 7),
  prefs: allOn,
  mealTimes: DEFAULT_MEAL_TIMES,
  loggedToday: new Set(),
  waterMlToday: 0,
  waterTargetMl: 2000,
  checkedInToday: false,
  ...over,
});
const hhmm = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('usualMealTimes', () => {
  const log = (day: number, h: number, m: number, slot: string) => ({
    logged_at: at(day, h, m).toISOString(),
    meal_slot: slot,
  });
  it('learns each meal’s median first-log time after 3 days', () => {
    const logs = [
      log(25, 13, 10, 'lunch'),
      log(25, 13, 40, 'lunch'), // later log the same day: ignored
      log(26, 13, 20, 'lunch'),
      log(27, 13, 30, 'lunch'),
      log(27, 7, 0, 'breakfast'),
    ];
    const times = usualMealTimes(logs);
    expect(times.lunch).toEqual({ hour: 13, minute: 20 });
    expect(times.breakfast).toEqual(DEFAULT_MEAL_TIMES.breakfast); // one day isn't enough
  });
  it('keeps learned times inside sensible windows', () => {
    const late = [25, 26, 27].map((d) => log(d, 23, 50, 'dinner'));
    expect(usualMealTimes(late).dinner).toEqual({ hour: 21, minute: 30 });
  });
});

describe('planReminders', () => {
  it('reminds 20 minutes after usual meal times for 3 days, skipping meals already logged', () => {
    const plan = planReminders(input({ now: at(30, 10), loggedToday: new Set(['breakfast']) }));
    const today = plan.filter((r) => r.at.getDate() === 30 && r.kind === 'meal');
    expect(today.map((r) => `${r.slot} ${hhmm(r.at)}`)).toEqual(['lunch 12:50', 'dinner 19:20']);
    expect(plan.filter((r) => r.kind === 'meal')).toHaveLength(2 + 3 + 3);
    expect(plan.every((r) => r.at > at(30, 10))).toBe(true);
  });

  it('nudges water only when behind today’s pace, at most 3 times', () => {
    const behind = planReminders(input({ now: at(30, 9), waterMlToday: 0 })).filter(
      (r) => r.kind === 'water' && r.at.getDate() === 30,
    );
    expect(behind.map((r) => hhmm(r.at))).toEqual(['10:30', '13:30', '16:00']);
    expect(behind.every((r) => r.behind)).toBe(true);
    const onTrack = planReminders(input({ now: at(30, 9), waterMlToday: 1000 })).filter(
      (r) => r.kind === 'water' && r.at.getDate() === 30,
    );
    expect(onTrack.map((r) => hhmm(r.at))).toEqual(['18:30']);
    const later = planReminders(input()).filter((r) => r.kind === 'water' && r.at.getDate() === 1);
    expect(later.map((r) => hhmm(r.at))).toEqual(['13:30', '16:00']);
  });

  it('skips the check-in once done and respects every switch', () => {
    const done = planReminders(input({ checkedInToday: true }));
    expect(done.some((r) => r.kind === 'checkin' && r.at.getDate() === 30)).toBe(false);
    const off = planReminders(
      input({ prefs: { meal_reminders: false, checkin_reminder: false, water_reminders: false } }),
    );
    expect(off).toEqual([]);
    expect(planReminders(input({ waterTargetMl: null })).some((r) => r.kind === 'water')).toBe(
      false,
    );
  });

  it('uses unique ids per day', () => {
    const ids = planReminders(input()).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('waterPace', () => {
  it('spreads the target from 8:00 to 20:00', () => {
    expect(waterPace(at(30, 7))).toBe(0);
    expect(waterPace(at(30, 14))).toBe(0.5);
    expect(waterPace(at(30, 21))).toBe(1);
  });
});

describe('routeFor', () => {
  it('routes taps by notification type or explicit route', () => {
    expect(routeFor({ type: 'achievement' })).toBe('/progress');
    expect(routeFor({ type: 'streak' })).toBe('/home');
    expect(routeFor({ type: 'weekly_report' })).toBe('/story');
    expect(routeFor({ route: '/check-in' })).toBe('/check-in');
    expect(routeFor({ route: 'https://evil.example' })).toBe('/home');
    expect(routeFor(undefined)).toBe('/home');
  });
});
