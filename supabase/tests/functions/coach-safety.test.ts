import { coachSystemPrompt } from '../../functions/_prompts/coach.v1';
import { buildCoachContext, type CoachContextData } from '../../functions/coach-chat/context';
import {
  combineFlags,
  screenMessage,
  SUPPORT_NOTES,
  withSupportNote,
} from '../../functions/coach-chat/safety';

describe('coach safety screen', () => {
  it.each([
    'I make myself throw up after dinner',
    'what laxatives work best for weight loss',
    'I want to starve myself until the wedding',
    'I binged again and hate my body',
    'is 500 calories a day ok?',
  ])('flags disordered eating: %s', (text) => {
    expect(screenMessage(text)).toBe('disordered_eating');
  });

  it.each(['I want to die', 'thinking about suicide', 'I keep hurting myself'])(
    'flags crisis: %s',
    (text) => {
      expect(screenMessage(text)).toBe('crisis');
    },
  );

  it.each(['What should I eat for dinner?', 'How much protein is in eggs?', 'I skipped the gym'])(
    'does not flag ordinary questions: %s',
    (text) => expect(screenMessage(text)).toBe('none'),
  );

  it('keeps the stricter flag and always appends the support note in code', () => {
    expect(combineFlags('none', 'disordered_eating')).toBe('disordered_eating');
    expect(combineFlags('crisis', 'disordered_eating')).toBe('crisis');
    expect(combineFlags('medical', 'none')).toBe('medical');
    const reply = withSupportNote('I hear you.', 'disordered_eating');
    expect(reply).toContain(SUPPORT_NOTES.disordered_eating);
    expect(withSupportNote(reply, 'disordered_eating')).toBe(reply); // not duplicated
    expect(withSupportNote('Try oats.', 'none')).toBe('Try oats.');
  });
});

describe('coach prompts', () => {
  it.each(['aria', 'max', 'luna'] as const)('%s carries every safety rule', (persona) => {
    const prompt = coachSystemPrompt(persona, '- Units: metric');
    for (const rule of [
      /not medical advice/i,
      /never promote extreme restriction/i,
      /purging, vomiting, laxatives/i,
      /disordered eating/i,
      /eating disorder helpline/i,
      /self-harm/i,
      /allergy/i,
      /Do not state calorie or macro numbers for specific foods/i,
      /"safety"/,
    ]) {
      expect(prompt).toMatch(rule);
    }
  });

  it('gives each persona its own voice', () => {
    expect(coachSystemPrompt('aria', '')).toMatch(/You are Aria, DietBuddy's nutrition coach/);
    expect(coachSystemPrompt('max', '')).toMatch(/You are Max, DietBuddy's fitness coach/);
    expect(coachSystemPrompt('luna', '')).toMatch(
      /You are Luna, DietBuddy's wellness and mindset coach/,
    );
  });
});

describe('coach context', () => {
  const data: CoachContextData = {
    profile: {
      birthDate: '1991-04-12',
      gender: 'female',
      heightCm: 168,
      units: 'metric',
      streakDays: 4,
    },
    goal: { types: ['lose_fat'], goalWeightKg: 70, pace: 'balanced' },
    preferences: {
      activityLevel: 'active',
      trainingFrequency: '2_3',
      dietStyles: ['vegetarian'],
      restrictions: ['halal', 'other'],
      restrictionOther: 'no mushrooms',
      avoidFoods: ['tuna'],
      allergies: ['peanuts'],
      allergyOther: 'kiwi',
    },
    plan: { calories: 1800, proteinG: 140, carbsG: 180, fatG: 60, waterMl: 2000 },
    latestWeightKg: 80.4,
    today: {
      calories: 620,
      proteinG: 41.6,
      carbsG: 50,
      fatG: 20,
      waterMl: 750,
      meals: ['Oats', 'Greek yogurt'],
    },
    last7DaysAvgCalories: 1750,
    latestCheckIn: { date: '2026-09-26', mood: 'good', energy: 7, sleepHours: 7.5 },
  };

  it('summarises targets, restrictions and today without identifiers', () => {
    const text = buildCoachContext(data, new Date('2026-09-26T15:00:00Z'));
    expect(text).toContain('age 35, female, height 168 cm, weight 80.4 kg');
    expect(text).toContain('Daily targets: 1800 kcal (never go below this)');
    expect(text).toContain('ALLERGIES (never suggest): peanuts, kiwi');
    expect(text).toContain('Restrictions: halal, no mushrooms');
    expect(text).toContain('Today so far: 620 kcal, protein 42 g');
    expect(text).toContain('logged: Oats, Greek yogurt');
    expect(text).not.toMatch(/1991|Olivia|@/);
  });
});
