/** Local reminders scheduled on the device (no server needed). Times are local. */
export interface Reminder {
  id: string;
  hour: number;
  minute: number;
  kind: 'meal' | 'checkin';
  route: string;
}

export const REMINDER_PREFIX = 'dietbuddy-reminder-';

export const MEAL_REMINDERS: Reminder[] = [
  { id: `${REMINDER_PREFIX}breakfast`, hour: 8, minute: 30, kind: 'meal', route: '/meals' },
  { id: `${REMINDER_PREFIX}lunch`, hour: 12, minute: 30, kind: 'meal', route: '/meals' },
  { id: `${REMINDER_PREFIX}dinner`, hour: 19, minute: 0, kind: 'meal', route: '/meals' },
];
export const CHECKIN_REMINDER: Reminder = {
  id: `${REMINDER_PREFIX}checkin`,
  hour: 20,
  minute: 30,
  kind: 'checkin',
  route: '/check-in',
};

export function remindersFor(prefs: {
  meal_reminders: boolean;
  checkin_reminder: boolean;
}): Reminder[] {
  return [
    ...(prefs.meal_reminders ? MEAL_REMINDERS : []),
    ...(prefs.checkin_reminder ? [CHECKIN_REMINDER] : []),
  ];
}

/** Where tapping a notification should go. */
export function routeFor(data: { type?: unknown; route?: unknown } | undefined): string {
  if (typeof data?.route === 'string' && data.route.startsWith('/')) return data.route;
  switch (data?.type) {
    case 'achievement':
    case 'weekly_report':
      return '/progress';
    case 'streak':
      return '/home';
    default:
      return '/home';
  }
}
