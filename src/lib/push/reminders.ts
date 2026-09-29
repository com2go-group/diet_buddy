/**
 * Local reminders planned on the device (no server, nothing leaves the phone): meal reminders at
 * the user's usual meal times, only for meals not logged yet; water nudges only when behind on
 * the day's water; the check-in reminder only until the day's check-in is done. Planned for today
 * and the next two days as one-off notifications and re-planned whenever the day's logs change,
 * so someone who stops opening the app stops getting reminders after a few days.
 */

export const REMINDER_PREFIX = 'dietbuddy-reminder-';

export type ReminderSlot = 'breakfast' | 'lunch' | 'dinner';
export type ReminderKind = 'meal' | 'water' | 'checkin';

export interface PlannedReminder {
  id: string;
  at: Date;
  kind: ReminderKind;
  slot?: ReminderSlot;
  /** Water nudge for today when already behind (else a general one on later days). */
  behind?: boolean;
  route: string;
}

export interface ReminderPrefs {
  meal_reminders: boolean;
  checkin_reminder: boolean;
  water_reminders: boolean;
}

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export const DEFAULT_MEAL_TIMES: Record<ReminderSlot, TimeOfDay> = {
  breakfast: { hour: 8, minute: 30 },
  lunch: { hour: 12, minute: 30 },
  dinner: { hour: 19, minute: 0 },
};
/** Learned times stay within these windows (minutes after midnight). */
const WINDOWS: Record<ReminderSlot, [number, number]> = {
  breakfast: [6 * 60 + 30, 11 * 60],
  lunch: [11 * 60 + 15, 15 * 60 + 30],
  dinner: [17 * 60, 21 * 60 + 30],
};
/** A reminder comes this long after the usual time, so it doesn't interrupt the meal itself. */
export const AFTER_USUAL_MINUTES = 20;
/** Days of history needed before a meal's time is learned. */
export const MIN_DAYS_TO_LEARN = 3;
export const CHECKIN_TIME: TimeOfDay = { hour: 20, minute: 30 };
/** Water nudges: candidate times; at most 3 a day, only when behind the day's pace. */
export const WATER_TIMES: TimeOfDay[] = [
  { hour: 10, minute: 30 },
  { hour: 13, minute: 30 },
  { hour: 16, minute: 0 },
  { hour: 18, minute: 30 },
];
export const MAX_WATER_NUDGES = 3;
/** The day's water target is spread evenly over these hours. */
const WATER_DAY: [number, number] = [8, 20];
/** Behind = less than this share of where the day's pace says you'd be. */
const BEHIND_SHARE = 0.7;
export const PLAN_DAYS = 3;

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * The usual time of each meal from recent logs: the median time of the first log of that meal
 * on each day, clamped to the meal's window. Defaults until there are MIN_DAYS_TO_LEARN days.
 */
export function usualMealTimes(
  logs: { logged_at: string; meal_slot: string }[],
): Record<ReminderSlot, TimeOfDay> {
  const out = { ...DEFAULT_MEAL_TIMES };
  for (const slot of Object.keys(DEFAULT_MEAL_TIMES) as ReminderSlot[]) {
    const firstByDay = new Map<string, number>();
    for (const log of logs) {
      if (log.meal_slot !== slot) continue;
      const at = new Date(log.logged_at);
      const minutes = at.getHours() * 60 + at.getMinutes();
      const key = localDay(at);
      if (!firstByDay.has(key) || minutes < firstByDay.get(key)!) firstByDay.set(key, minutes);
    }
    if (firstByDay.size < MIN_DAYS_TO_LEARN) continue;
    const [lo, hi] = WINDOWS[slot];
    const m = Math.min(hi, Math.max(lo, Math.round(median([...firstByDay.values()]))));
    out[slot] = { hour: Math.floor(m / 60), minute: m % 60 };
  }
  return out;
}

const atTime = (day: Date, t: TimeOfDay, plusMinutes = 0) => {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.hour, t.minute);
  return new Date(d.getTime() + plusMinutes * 60_000);
};

/** Water a steady pace would have reached by `at`, as a share of the target (0–1). */
export function waterPace(at: Date): number {
  const h = at.getHours() + at.getMinutes() / 60;
  const [start, end] = WATER_DAY;
  return Math.min(1, Math.max(0, (h - start) / (end - start)));
}

export interface ReminderInput {
  now: Date;
  prefs: ReminderPrefs;
  mealTimes: Record<ReminderSlot, TimeOfDay>;
  /** Today's logged meals (any source) and water, and whether today's check-in is done. */
  loggedToday: Set<string>;
  waterMlToday: number;
  waterTargetMl: number | null;
  checkedInToday: boolean;
}

/** Today's and the next days' reminders, soonest first; nothing in the past. */
export function planReminders(input: ReminderInput, days = PLAN_DAYS): PlannedReminder[] {
  const { now, prefs } = input;
  const out: PlannedReminder[] = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const key = localDay(day);
    const today = d === 0;
    if (prefs.meal_reminders) {
      for (const slot of Object.keys(input.mealTimes) as ReminderSlot[]) {
        if (today && input.loggedToday.has(slot)) continue;
        out.push({
          id: `${REMINDER_PREFIX}${key}-${slot}`,
          at: atTime(day, input.mealTimes[slot], AFTER_USUAL_MINUTES),
          kind: 'meal',
          slot,
          route: '/meals',
        });
      }
    }
    if (prefs.water_reminders && input.waterTargetMl) {
      let nudges = 0;
      for (const time of WATER_TIMES) {
        if (nudges >= MAX_WATER_NUDGES) break;
        const at = atTime(day, time);
        // Today we know the water so far: only nudge when it is behind where the pace would be
        // by then. Later days: a couple of gentle nudges (re-planned once that day's logs come).
        const behind = today
          ? input.waterMlToday < input.waterTargetMl * waterPace(at) * BEHIND_SHARE
          : time.hour === 13 || time.hour === 16;
        if (!behind) continue;
        nudges++;
        out.push({
          id: `${REMINDER_PREFIX}${key}-water-${time.hour}`,
          at,
          kind: 'water',
          behind: today,
          route: '/home',
        });
      }
    }
    if (prefs.checkin_reminder && !(today && input.checkedInToday)) {
      out.push({
        id: `${REMINDER_PREFIX}${key}-checkin`,
        at: atTime(day, CHECKIN_TIME),
        kind: 'checkin',
        route: '/check-in',
      });
    }
  }
  return out
    .filter((r) => r.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Where tapping a notification should go. */
export function routeFor(data: { type?: unknown; route?: unknown } | undefined): string {
  if (typeof data?.route === 'string' && data.route.startsWith('/')) return data.route;
  switch (data?.type) {
    case 'achievement':
      return '/progress';
    case 'weekly_report':
      return '/story';
    case 'streak':
      return '/home';
    case 'referral':
      return '/invite';
    default:
      return '/home';
  }
}
