import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { EMPTY_DRAFT, type OnboardingDraft } from '../../onboarding/draft';
import { loadGoalEdit, saveGoalEdit } from '../api';
import { editDraft, editMetric, goalErrors, previewPlan, withLosing } from '../goalEdit';
import { GoalEditScreen } from '../GoalEditScreen';

jest.mock('../api', () => ({
  loadGoalEdit: jest.fn(),
  saveGoalEdit: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const draft: OnboardingDraft = {
  ...EMPTY_DRAFT,
  name: 'Olivia',
  birthDate: { day: '12', month: '4', year: '1991' },
  sex: 'female',
  weightKg: 82,
  heightCm: 168,
  goals: ['lose_fat', 'build_muscle'],
  goalWeightKg: 70,
  pace: 'balanced',
  activity: 'active',
  training: '2_3',
};
const metric = { weight_kg: 78, bmr: null, tdee: null, user_overridden: false };
const fmt = (kg: number) => `${kg} kg`;

describe('goal editing', () => {
  it('plans from the latest weight', () => {
    expect(editDraft(draft, metric).weightKg).toBe(78);
    expect(editDraft(draft, null).weightKg).toBe(82);
  });

  it('turns weight loss off, keeping other goals, and back on', () => {
    const off = withLosing(draft, false);
    expect(off.goals).toEqual(['build_muscle']);
    expect(off.goalWeightKg).toBeNull();
    expect(withLosing({ ...draft, goals: ['lose_fat'] }, false).goals).toEqual([
      'healthy_lifestyle',
    ]);
    expect(withLosing(off, true).goals).toEqual(['lose_fat', 'build_muscle']);
  });

  it('only previews safe goals (below the current weight, goal BMI ≥ 18.5)', () => {
    const current = editDraft(draft, metric);
    expect(previewPlan(current, metric, fmt)?.plan.timeline?.kgToLose).toBe(8);
    expect(previewPlan({ ...current, goalWeightKg: 80 }, metric, fmt)).toBeNull();
    expect(previewPlan({ ...current, goalWeightKg: 45 }, metric, fmt)).toBeNull();
  });

  it('needs at least one goal', () => {
    expect(goalErrors({ ...draft, goals: [] }, fmt).goals).toBeDefined();
    expect(previewPlan({ ...draft, goals: [] }, metric, fmt)).toBeNull();
  });

  it('plans maintenance for recomposition at BMI < 25 and a surplus for Build Muscle', () => {
    // Male, 24, 188 cm, 88 kg (BMR 1,940): the case that prompted this screen.
    const man: OnboardingDraft = {
      ...draft,
      sex: 'male',
      birthDate: { day: '5', month: '2', year: '2002' },
      heightCm: 188,
      weightKg: 88,
      goalWeightKg: null,
      activity: 'very_active',
    };
    const at = new Date(2026, 9, 19);
    const kcal = (d: Partial<OnboardingDraft>) =>
      previewPlan({ ...man, ...d }, null, fmt, at)?.plan.dailyCalories;
    expect(kcal({ goals: ['build_muscle'] })).toBe(3600);
    expect(kcal({ goals: ['build_muscle'], activity: 'active' })).toBe(3260);
    expect(kcal({ goals: ['body_recomposition'], activity: 'active' })).toBe(3010);
  });

  it('recalculates an edited TDEE when the activity level changes', () => {
    const edited = { weight_kg: 88, bmr: 1900, tdee: 3400, user_overridden: true };
    const active = { ...draft, activity: 'active' as const };
    expect(editMetric(edited, active, 'active')).toBe(edited);
    expect(editMetric(edited, { ...draft, activity: 'sedentary' }, 'active')?.tdee).toBe(2280);
    expect(editMetric(metric, { ...draft, activity: 'sedentary' }, 'active')).toBe(metric);
  });

  it('saves goals, activity and a new plan from the screen', async () => {
    (loadGoalEdit as jest.Mock).mockResolvedValue({
      state: { draft, step: 'aiPlan', goalId: 'g1' },
      metric,
      currentKcal: 1800,
    });
    await renderScreen(<GoalEditScreen />, 'u1');
    expect(await screen.findByText('Your latest weight: 78 kg')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /Sustainable/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /Lightly Active/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /4–5/ }));
    expect(screen.getByText(/Daily target:/)).toBeOnTheScreen();
    expect(screen.getByText('Now: 1,800 kcal')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(saveGoalEdit).toHaveBeenCalled());
    const [userId, goalId, saved] = (saveGoalEdit as jest.Mock).mock.calls[0];
    expect([userId, goalId, saved.pace, saved.weightKg, saved.activity, saved.training]).toEqual([
      'u1',
      'g1',
      'sustainable',
      78,
      'lightly_active',
      '4_5',
    ]);
  });
});
