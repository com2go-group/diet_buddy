import { Constants, isSupabaseConfigured, supabase, type TablesInsert } from '..';
import type { ActivityLevel, GoalType, Pace, Sex } from '@/lib/nutrition';

// Compile-time checks: the database enums and the nutrition module's types must stay identical.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const enumsMatch: [
  Same<(typeof Constants.public.Enums.gender)[number], Sex>,
  Same<(typeof Constants.public.Enums.activity_level)[number], ActivityLevel>,
  Same<(typeof Constants.public.Enums.goal_type)[number], GoalType>,
  Same<(typeof Constants.public.Enums.pace)[number], Pace>,
] = [true, true, true, true];

describe('supabase client', () => {
  it('reports missing configuration instead of failing at import', () => {
    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeDefined();
  });

  it('keeps database enums in sync with the nutrition types', () => {
    expect(enumsMatch).toEqual([true, true, true, true]);
  });

  it('types inserts from the schema', () => {
    const log: TablesInsert<'food_logs'> = {
      meal_slot: 'lunch',
      name: 'Grilled chicken salad',
      calories: 520,
      source: 'manual',
    };
    // @ts-expect-error — xp is not a column on food_logs
    const invalid: TablesInsert<'food_logs'> = { ...log, xp: 10 };
    expect(invalid.name).toBe(log.name);
    expect(typeof supabase.from('food_logs').insert(log).select).toBe('function');
  });
});
