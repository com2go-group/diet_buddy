import { remindersFor, routeFor } from '../reminders';

describe('reminders', () => {
  it('schedules meal and check-in reminders from the preferences', () => {
    expect(
      remindersFor({ meal_reminders: true, checkin_reminder: true }).map(
        (r) => `${r.hour}:${r.minute}`,
      ),
    ).toEqual(['8:30', '12:30', '19:0', '20:30']);
    expect(remindersFor({ meal_reminders: false, checkin_reminder: true })).toHaveLength(1);
    expect(remindersFor({ meal_reminders: false, checkin_reminder: false })).toEqual([]);
  });

  it('routes taps by notification type or explicit route', () => {
    expect(routeFor({ type: 'achievement' })).toBe('/progress');
    expect(routeFor({ type: 'streak' })).toBe('/home');
    expect(routeFor({ route: '/check-in' })).toBe('/check-in');
    expect(routeFor({ route: 'https://evil.example' })).toBe('/home');
    expect(routeFor(undefined)).toBe('/home');
  });
});
