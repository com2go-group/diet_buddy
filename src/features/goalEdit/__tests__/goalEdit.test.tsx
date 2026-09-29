import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { EMPTY_DRAFT, type OnboardingDraft } from '../../onboarding/draft';
import { loadInitialPlan } from '../../plan/api';
import { saveGoalEdit } from '../api';
import { editDraft, previewPlan, withLosing } from '../goalEdit';
import { GoalEditScreen } from '../GoalEditScreen';

jest.mock('../../plan/api', () => ({ loadInitialPlan: jest.fn() }));
jest.mock('../api', () => ({ saveGoalEdit: jest.fn(async () => undefined) }));
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

  it('saves a new goal and plan from the screen', async () => {
    (loadInitialPlan as jest.Mock).mockResolvedValue({
      state: { draft, step: 'aiPlan', goalId: 'g1' },
      metric,
    });
    await renderScreen(<GoalEditScreen />, 'u1');
    expect(await screen.findByText('Your latest weight: 78 kg')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /Sustainable/ }));
    expect(screen.getByText(/Daily target:/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save goal' }));
    await waitFor(() => expect(saveGoalEdit).toHaveBeenCalled());
    const [userId, goalId, saved] = (saveGoalEdit as jest.Mock).mock.calls[0];
    expect([userId, goalId, saved.pace, saved.weightKg]).toEqual(['u1', 'g1', 'sustainable', 78]);
  });
});
