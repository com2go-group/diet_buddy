/**
 * Turns raw rows into the per-day numbers the insights model sees (no names, no free text, no
 * food names). Pure so it can be unit-tested; days are the user's local days.
 */

export const WINDOW_DAYS = 14;
export const MIN_DAYS_LOGGED = 5;

export interface RawData {
  food: { logged_at: string; calories: number; protein_g: number | null }[];
  water: { logged_at: string; ml: number }[];
  checkins: {
    date: string;
    mood: string | null;
    energy: number | null;
    sleep_hours: number | null;
    hunger: string | null;
  }[];
  weights: { measured_at: string; weight_kg: number }[];
}

export interface DaySummary {
  date: string;
  weekday: string;
  kcal: number | null;
  proteinG: number | null;
  /** Share of the day's calories eaten from 18:00 local time. */
  eveningPct: number | null;
  waterMl: number;
  mood: string | null;
  energy: number | null;
  sleepHours: number | null;
  hunger: string | null;
}

export interface Summary {
  days: DaySummary[];
  daysLogged: number;
  weight: { firstKg: number; lastKg: number; days: number } | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY = 86_400_000;

/** Local calendar date and hour of an instant, for a UTC offset in minutes (e.g. +120). */
function local(iso: string, offsetMin: number): { date: string; hour: number } {
  const d = new Date(new Date(iso).getTime() + offsetMin * 60_000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

/** The last 14 local days, oldest first, ending yesterday (today is still in progress). */
export function windowDays(now: Date, offsetMin: number): string[] {
  const today = local(now.toISOString(), offsetMin).date;
  const base = new Date(`${today}T00:00:00Z`).getTime();
  return Array.from({ length: WINDOW_DAYS }, (_, i) =>
    new Date(base - (WINDOW_DAYS - i) * DAY).toISOString().slice(0, 10),
  );
}

const round = (n: number) => Math.round(n);

export function summarise(raw: RawData, now: Date, offsetMin: number): Summary {
  const dates = windowDays(now, offsetMin);
  const inWindow = new Set(dates);
  const food = new Map<string, { kcal: number; protein: number; evening: number }>();
  for (const f of raw.food) {
    const { date, hour } = local(f.logged_at, offsetMin);
    if (!inWindow.has(date)) continue;
    const day = food.get(date) ?? { kcal: 0, protein: 0, evening: 0 };
    day.kcal += Number(f.calories);
    day.protein += Number(f.protein_g ?? 0);
    if (hour >= 18) day.evening += Number(f.calories);
    food.set(date, day);
  }
  const water = new Map<string, number>();
  for (const w of raw.water) {
    const { date } = local(w.logged_at, offsetMin);
    if (inWindow.has(date)) water.set(date, (water.get(date) ?? 0) + Number(w.ml));
  }
  const checkins = new Map(raw.checkins.map((c) => [c.date, c]));

  const days = dates.map((date): DaySummary => {
    const f = food.get(date);
    const c = checkins.get(date);
    return {
      date,
      weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!,
      kcal: f ? round(f.kcal) : null,
      proteinG: f ? round(f.protein) : null,
      eveningPct: f && f.kcal > 0 ? round((f.evening / f.kcal) * 100) : null,
      waterMl: round(water.get(date) ?? 0),
      mood: c?.mood ?? null,
      energy: c?.energy ?? null,
      sleepHours: c?.sleep_hours ?? null,
      hunger: c?.hunger ?? null,
    };
  });

  const weights = raw.weights
    .filter((w) => inWindow.has(local(w.measured_at, offsetMin).date))
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const first = weights[0];
  const last = weights[weights.length - 1];
  return {
    days,
    daysLogged: days.filter((d) => d.kcal !== null).length,
    weight:
      first && last && first !== last
        ? {
            firstKg: Number(first.weight_kg),
            lastKg: Number(last.weight_kg),
            days: Math.round(
              (new Date(last.measured_at).getTime() - new Date(first.measured_at).getTime()) / DAY,
            ),
          }
        : null,
  };
}
