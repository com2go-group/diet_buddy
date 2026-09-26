import { weekStats, type StoryInput } from '../story';

const now = new Date(2026, 8, 26, 18);
const at = (day: number, hour = 12) => new Date(2026, 8, day, hour).toISOString();
const base: StoryInput = {
  now,
  targets: { calories: 2000, proteinG: 120, waterMl: 2000 },
  food: [],
  water: [],
  checkins: [],
  weights: [],
  badges: [],
  streakDays: 5,
  xp: 320,
};

describe('weekStats', () => {
  it('covers the 7 local days ending today', () => {
    const s = weekStats(base);
    expect(s.start).toEqual(new Date(2026, 8, 20));
    expect(s.end).toEqual(new Date(2026, 8, 26));
    expect(s).toMatchObject({ daysLogged: 0, avgScore: null, streakDays: 5, level: 3 });
  });

  it('counts logged days, days on target and water goal days inside the week only', () => {
    const s = weekStats({
      ...base,
      food: [
        { logged_at: at(19), calories: 2000, protein_g: 100 }, // before the week
        { logged_at: at(20, 8), calories: 900, protein_g: 40 },
        { logged_at: at(20, 19), calories: 1100, protein_g: 60 }, // 2000 → on target
        { logged_at: at(22), calories: 1500, protein_g: 80 }, // 75 % → not on target
        { logged_at: at(25), calories: 2300, protein_g: 120 }, // 115 % → not on target
      ],
      water: [
        { logged_at: at(20), ml: 2000 },
        { logged_at: at(22), ml: 1750 },
      ],
      checkins: [{ date: '2026-09-19' }, { date: '2026-09-21' }, { date: '2026-09-26' }],
    });
    expect(s).toMatchObject({ daysLogged: 3, daysOnTarget: 1, waterDays: 1, checkins: 2 });
    expect(s.avgScore).toBeGreaterThan(0);
  });

  it('never counts undereating as on target', () => {
    const s = weekStats({ ...base, food: [{ logged_at: at(24), calories: 1000, protein_g: 50 }] });
    expect(s.daysOnTarget).toBe(0);
  });

  it('measures weight change from the last weigh-in before the week', () => {
    const s = weekStats({
      ...base,
      weights: [
        { measured_at: at(24), weight_kg: 80.6 },
        { measured_at: at(10), weight_kg: 82 },
        { measured_at: at(17), weight_kg: 81.4 },
        { measured_at: at(26), weight_kg: null },
      ],
    });
    expect(s.weightChangeKg).toBe(-0.8);
  });

  it('uses the first weigh-in of the week without an earlier one, else no change', () => {
    const two = [
      { measured_at: at(21), weight_kg: 70 },
      { measured_at: at(25), weight_kg: 70.4 },
    ];
    expect(weekStats({ ...base, weights: two }).weightChangeKg).toBe(0.4);
    expect(weekStats({ ...base, weights: [two[0]!] }).weightChangeKg).toBeNull();
    expect(
      weekStats({ ...base, weights: [{ measured_at: at(1), weight_kg: 70 }] }).weightChangeKg,
    ).toBeNull();
  });

  it('lists this week’s badges newest first', () => {
    const s = weekStats({
      ...base,
      badges: [
        { title: 'Old', emoji: '🥉', unlockedAt: at(10) },
        { title: 'First Bite', emoji: null, unlockedAt: at(21) },
        { title: 'Hydrated', emoji: '💧', unlockedAt: at(24) },
      ],
    });
    expect(s.badges).toEqual([
      { title: 'Hydrated', emoji: '💧' },
      { title: 'First Bite', emoji: '🏅' },
    ]);
  });

  it('works without a plan', () => {
    const s = weekStats({
      ...base,
      targets: null,
      food: [{ logged_at: at(24), calories: 2000, protein_g: 50 }],
    });
    expect(s).toMatchObject({ daysLogged: 1, daysOnTarget: 0, waterDays: 0, avgScore: null });
  });
});
