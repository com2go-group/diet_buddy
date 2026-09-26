import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { showRewarded } from '@/lib/ads';
import { dayKey } from '@/lib/dates';
import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import { logFood } from '../api';
import { MealPlanSection } from '../components/MealPlanSection';
import { generateMealPlan, loadMealPlan, MealPlanError, type MealPlan } from '../mealPlanApi';

jest.mock('../mealPlanApi', () => ({
  ...jest.requireActual('../mealPlanApi'),
  loadMealPlan: jest.fn(),
  generateMealPlan: jest.fn(),
}));
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  logFood: jest.fn(async () => undefined),
}));
jest.mock('@/lib/ads', () => ({
  adsSupported: true,
  showRewarded: jest.fn(),
  initAds: jest.fn(),
  openAdPrivacyOptions: jest.fn(),
}));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: async () => ({ data: [{ id: 'x' }], error: null }),
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const item = (name: string, kcal: number) => ({
  name,
  foodRef: `usda:${name}`,
  source: name,
  grams: 100,
  kcal,
  proteinG: 10,
  carbsG: 20,
  fatG: 5,
});
const plan: MealPlan = {
  date: '2026-09-27',
  slots: {
    breakfast: [item('Rolled oats', 228), item('Blueberries', 57), item('Greek yogurt', 97)],
    lunch: [item('Roast chicken', 248)],
    snack: [item('Apple', 78)],
    dinner: [item('Lentils', 290)],
  },
  totals: { kcal: 998, proteinG: 60, carbsG: 120, fatG: 30 },
};
const today = new Date();

describe('MealPlanSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStorePremium.setState({ premium: false });
  });

  it('offers to create today’s plan and shows errors', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan: null, unlockedSlots: [] });
    (generateMealPlan as jest.Mock)
      .mockRejectedValueOnce(new MealPlanError('generation_failed'))
      .mockResolvedValueOnce(plan);
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Create my plan' }));
    expect(
      await screen.findByText(/couldn’t build a plan that fits all your requirements/),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Create my plan' }));
    expect(await screen.findByText('Rolled oats')).toBeOnTheScreen();
  });

  it('shows free users the first item and locks the rest behind an opt-in video', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (showRewarded as jest.Mock).mockResolvedValue('earned');
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    expect(await screen.findByText('Rolled oats')).toBeOnTheScreen();
    expect(screen.queryByText('Blueberries')).toBeNull();
    expect(screen.getByText('2 more items hidden')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Watch a short video to reveal this meal · +15 XP' }),
    );
    expect(await screen.findByText('Blueberries')).toBeOnTheScreen();
    expect((showRewarded as jest.Mock).mock.calls[0][0]).toMatchObject({
      type: 'meal_plan',
      target: `${dayKey(today)}:breakfast`,
    });
  });

  it('unlocks only the meal whose video was watched', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: ['lunch'] });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    expect(await screen.findByText('2 more items hidden')).toBeOnTheScreen();
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: ['breakfast'] });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    expect(await screen.findByText('Greek yogurt')).toBeOnTheScreen();
  });

  it('logs a planned item with its USDA numbers', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await renderScreen(<MealPlanSection day={today} slot="lunch" isToday logs={[]} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Log Roast chicken' }));
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      slot: 'lunch',
      name: 'Roast chicken',
      foodRef: 'usda:Roast chicken',
      quantity: 100,
      unit: 'g',
      macros: { kcal: 248, proteinG: 10, carbsG: 20, fatG: 5 },
      source: 'plan',
    });
  });
});
