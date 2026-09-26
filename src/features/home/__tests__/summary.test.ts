import { homeInsight, scoreMessage, summarizeHome, type HomeData } from '../summary';

const NOW = new Date(2026, 8, 26, 15, 0); // Saturday 15:00 local
const at = (day: number, hour: number) => new Date(2026, 8, day, hour, 0).toISOString();

const base: HomeData = {
  profile: { name: 'Olivia', xp: 40, streak_days: 2, units: 'metric' },
  plan: { daily_calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67, water_ml: 2500 },
  food: [],
  water: [],
  checkins: [],
};

const food = (
  id: string,
  day: number,
  hour: number,
  slot: 'breakfast' | 'lunch' | 'snack' | 'dinner',
  calories: number,
  protein = 0,
) => ({
  id,
  logged_at: at(day, hour),
  meal_slot: slot,
  name: id,
  calories,
  protein_g: protein,
  carbs_g: 10,
  fat_g: 5,
});

describe('summarizeHome', () => {
  it('totals today only and groups meals by slot', () => {
    const s = summarizeHome(
      {
        ...base,
        food: [
          food('oats', 26, 8, 'breakfast', 400, 15),
          food('salad', 26, 13, 'lunch', 600, 40),
          food('old', 25, 19, 'dinner', 900, 50),
        ],
        water: [
          { id: 'w1', logged_at: at(26, 9), ml: 250 },
          { id: 'w2', logged_at: at(26, 11), ml: 250 },
          { id: 'w0', logged_at: at(25, 9), ml: 250 },
        ],
      },
      NOW,
    );
    expect(s.today).toMatchObject({
      calories: 1000,
      proteinG: 55,
      carbsG: 20,
      fatG: 10,
      waterMl: 500,
      glasses: 2,
    });
    expect(s.today.meals.breakfast.map((m) => m.name)).toEqual(['oats']);
    expect(s.today.meals.dinner).toEqual([]);
    expect(s.lastWaterLogId).toBe('w2');
  });

  it('scores today and the last 7 days, ending today', () => {
    const s = summarizeHome(
      {
        ...base,
        food: [food('a', 26, 8, 'breakfast', 2000, 150), food('b', 21, 8, 'breakfast', 1000, 0)],
        water: [{ id: 'w', logged_at: at(26, 9), ml: 2500 }],
        checkins: [{ date: '2026-09-26', mood: 'good' }],
      },
      NOW,
    );
    expect(s.today.score).toBe(100);
    expect(s.week.map((d) => d.weekday)).toEqual(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    expect(s.week.map((d) => d.score)).toEqual([null, 20, null, null, null, null, 100]);
    expect(s.week.at(-1)?.isToday).toBe(true);
  });

  it('has no targets or scores without a plan', () => {
    const s = summarizeHome(
      { ...base, plan: null, food: [food('a', 26, 8, 'breakfast', 500)] },
      NOW,
    );
    expect(s.targets).toBeNull();
    expect(s.today.score).toBeNull();
  });
});

describe('homeInsight', () => {
  const summary = (data: Partial<HomeData>, now = NOW) => summarizeHome({ ...base, ...data }, now);

  it('nudges to start logging', () => {
    expect(homeInsight(summary({}), 8)).toBe('startDay');
    expect(homeInsight(summary({}), 15)).toBe('nothingLogged');
  });

  it('flags a protein gap in the afternoon', () => {
    expect(homeInsight(summary({ food: [food('a', 26, 8, 'breakfast', 900, 20)] }), 15)).toBe(
      'lowProtein',
    );
    expect(homeInsight(summary({ food: [food('a', 26, 8, 'breakfast', 900, 20)] }), 10)).not.toBe(
      'lowProtein',
    );
  });

  it('flags low water after protein is fine', () => {
    expect(homeInsight(summary({ food: [food('a', 26, 8, 'breakfast', 900, 100)] }), 15)).toBe(
      'lowWater',
    );
  });

  it('gently notes a day well over target', () => {
    expect(homeInsight(summary({ food: [food('a', 26, 8, 'breakfast', 2500, 150)] }), 15)).toBe(
      'overCalories',
    );
  });

  it('reminds to check in, then says on track', () => {
    const food1 = [food('a', 26, 8, 'breakfast', 1500, 120)];
    const water = [{ id: 'w', logged_at: at(26, 9), ml: 2000 }];
    expect(homeInsight(summary({ food: food1, water }), 15)).toBe('checkIn');
    expect(
      homeInsight(
        summary({ food: food1, water, checkins: [{ date: '2026-09-26', mood: 'great' }] }),
        15,
      ),
    ).toBe('onTrack');
  });
});

describe('scoreMessage', () => {
  it('bands the score', () => {
    expect([null, 30, 65, 90].map(scoreMessage)).toEqual(['none', 'low', 'mid', 'high']);
  });
});
