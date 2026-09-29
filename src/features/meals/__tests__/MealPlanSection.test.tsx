import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { showRewarded } from '@/lib/ads';
import { dayKey } from '@/lib/dates';
import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import { logFood } from '../api';
import { MealPlanSection } from '../components/MealPlanSection';
import {
  generateMealPlan,
  loadMealPlan,
  mealPlanAction,
  MealPlanError,
  type MealPlan,
} from '../mealPlanApi';
import type { FoodLog } from '../types';

jest.mock('../mealPlanApi', () => ({
  ...jest.requireActual('../mealPlanApi'),
  loadMealPlan: jest.fn(),
  generateMealPlan: jest.fn(),
  mealPlanAction: jest.fn(),
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
  dishes: {
    breakfast: { title: 'Overnight oats with berries', description: 'Soak the oats overnight.' },
    lunch: { title: 'Roast chicken plate', description: '' },
  },
};
const today = new Date();
const planLog = (
  slot: FoodLog['meal_slot'],
  foodRef: string,
  calories: number,
  source: FoodLog['source'] = 'plan',
): FoodLog => ({
  id: `${slot}-${foodRef}`,
  logged_at: today.toISOString(),
  meal_slot: slot,
  food_ref: foodRef,
  name: foodRef,
  quantity: 100,
  unit: 'g',
  calories,
  protein_g: 10,
  carbs_g: 20,
  fat_g: 5,
  source,
});

describe('MealPlanSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStorePremium.setState({ premium: false });
  });

  it('creates today’s plan automatically, once, and offers a retry after an error', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan: null, unlockedSlots: [] });
    (generateMealPlan as jest.Mock)
      .mockRejectedValueOnce(new MealPlanError('generation_failed'))
      .mockResolvedValueOnce(plan);
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    expect(
      await screen.findByText(/couldn’t build a plan that fits all your requirements/),
    ).toBeOnTheScreen();
    expect(generateMealPlan).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Rolled oats', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(screen.getByText('✨ Your breakfast suggestion')).toBeOnTheScreen();
  });

  it('does not create plans for other days', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan: null, unlockedSlots: [] });
    const yesterday = new Date(today.getTime() - 86_400_000);
    await renderScreen(
      <MealPlanSection day={yesterday} slot="breakfast" isToday={false} logs={[]} />,
    );
    await waitFor(() => expect(loadMealPlan).toHaveBeenCalled());
    expect(generateMealPlan).not.toHaveBeenCalled();
  });

  it('keeps later meals locked until the current one is logged from the plan', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    const onSelectSlot = jest.fn();
    await renderScreen(
      <MealPlanSection day={today} slot="lunch" isToday logs={[]} onSelectSlot={onSelectSlot} />,
    );
    expect(await screen.findByText('🔒 Your lunch suggestion comes next')).toBeOnTheScreen();
    expect(screen.queryByText('Roast chicken')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Go to breakfast' }));
    expect(onSelectSlot).toHaveBeenCalledWith('breakfast');
  });

  it('adapts the next meal to what was eaten, using the USDA numbers', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    // 700 of a 1000 kcal target eaten; 616 planned for the rest → portions × 0.6 (the minimum).
    const logs = [planLog('breakfast', 'usda:Rolled oats', 700)];
    await renderScreen(
      <MealPlanSection day={today} slot="lunch" isToday logs={logs} targetKcal={1000} />,
    );
    expect(
      await screen.findByText('Portions adjusted to what you’ve eaten today.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Roast chicken')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'I ate Roast chicken plate' }));
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      name: 'Roast chicken plate',
      quantity: 1,
      unit: 'meal',
      macros: { kcal: 149, proteinG: 6, carbsG: 12, fatG: 3 },
      source: 'plan',
    });
  });

  it('marks the day done once every planned meal is logged', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    const logs = [
      planLog('breakfast', 'usda:Rolled oats', 228),
      planLog('lunch', 'usda:Roast chicken', 248),
      planLog('snack', 'usda:Apple', 78),
      planLog('dinner', 'usda:Lentils', 290),
    ];
    await renderScreen(<MealPlanSection day={today} slot="dinner" isToday logs={logs} />);
    expect(await screen.findByText('Dinner logged ✓')).toBeOnTheScreen();
    expect(screen.getByText('All of today’s planned meals are logged 🎉')).toBeOnTheScreen();
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

  it('shows the whole dish and logs it as one meal with its USDA numbers', async () => {
    useStorePremium.setState({ premium: true });
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    expect(await screen.findByText('Overnight oats with berries')).toBeOnTheScreen();
    expect(screen.getByText('Soak the oats overnight.')).toBeOnTheScreen();
    expect(screen.getByText('Greek yogurt')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'I ate Overnight oats with berries' }),
    );
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      slot: 'breakfast',
      name: 'Overnight oats with berries',
      foodRef: `plan:${dayKey(today)}:breakfast`,
      quantity: 1,
      unit: 'meal',
      macros: { kcal: 382, proteinG: 30, carbsG: 60, fatG: 15 },
      source: 'plan',
    });
  });

  it('shows the recipe once the meal is revealed', async () => {
    useStorePremium.setState({ premium: true });
    (loadMealPlan as jest.Mock).mockResolvedValue({
      plan: {
        ...plan,
        dishes: {
          ...plan.dishes,
          breakfast: {
            title: 'Overnight oats with berries',
            description: '',
            steps: ['Mix the oats and yogurt.', 'Top with blueberries.'],
            prepMinutes: 5,
          },
        },
      },
      unlockedSlots: [],
    });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    expect(await screen.findByText('⏱ 5 min')).toBeOnTheScreen();
    expect(screen.queryByText('Top with blueberries.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'How to make it (2 steps)' }));
    expect(screen.getByText('Top with blueberries.')).toBeOnTheScreen();
  });

  it('swaps the dish for another idea', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (mealPlanAction as jest.Mock).mockResolvedValue({
      ...plan,
      slots: { ...plan.slots, breakfast: [item('Eggs', 150)] },
      dishes: { ...plan.dishes, breakfast: { title: 'Scrambled eggs', description: '' } },
    });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Another idea' }));
    expect(await screen.findByText('Scrambled eggs')).toBeOnTheScreen();
    expect(mealPlanAction).toHaveBeenCalledWith(dayKey(today), 'alternative', 'breakfast');
  });

  it('explains when today’s other ideas are used up', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (mealPlanAction as jest.Mock).mockRejectedValue(new MealPlanError('alternative_limit'));
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Another idea' }));
    expect(await screen.findByText(/You’ve used today’s other ideas/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Get more ideas with Premium' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { feature: 'mealPlans' },
    });
  });

  it('skips a meal and can undo it', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (mealPlanAction as jest.Mock).mockResolvedValueOnce({ ...plan, skipped: ['breakfast'] });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Skip this meal' }));
    expect(await screen.findByText('Breakfast skipped')).toBeOnTheScreen();
    expect(mealPlanAction).toHaveBeenCalledWith(dayKey(today), 'skip', 'breakfast');
    (mealPlanAction as jest.Mock).mockResolvedValueOnce(plan);
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('✨ Your breakfast suggestion')).toBeOnTheScreen();
    expect(mealPlanAction).toHaveBeenLastCalledWith(dayKey(today), 'unskip', 'breakfast');
  });

  it('lets the user log their own meal instead, which moves the plan on', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={[]} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'I ate something else' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/log-food',
      params: { slot: 'breakfast', date: dayKey(today) },
    });
    const logs = [planLog('breakfast', 'usda:Toast', 300, 'search')];
    await renderScreen(<MealPlanSection day={today} slot="breakfast" isToday logs={logs} />);
    expect(await screen.findByText('You logged your own meal (see below).')).toBeOnTheScreen();
  });
});
