import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { showRewarded } from '@/lib/ads';
import { dayKey } from '@/lib/dates';
import { renderScreen } from '@/test/render';

import { useJourneyStore } from '../../home/journeyStore';
import { useStorePremium } from '../../subscriptions/usePremium';
import { logFood } from '../api';
import { MealTimeline } from '../components/MealTimeline';
import {
  generateMealPlan,
  loadMealPlan,
  mealPlanAction,
  MealPlanError,
  swapIngredient,
  type MealPlan,
} from '../mealPlanApi';
import type { FoodLog } from '../types';

jest.mock('../mealPlanApi', () => ({
  ...jest.requireActual('../mealPlanApi'),
  loadMealPlan: jest.fn(),
  generateMealPlan: jest.fn(),
  mealPlanAction: jest.fn(),
  swapIngredient: jest.fn(),
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

const onAdd = jest.fn();
const timeline = (logs: FoodLog[] = [], opts: { day?: Date; targetKcal?: number } = {}) => {
  const day = opts.day ?? today;
  return renderScreen(
    <MealTimeline
      day={day}
      isToday={dayKey(day) === dayKey(today)}
      logs={logs}
      targetKcal={opts.targetKcal ?? null}
      onAdd={onAdd}
      onDelete={jest.fn()}
    />,
  );
};
const openChange = (slot: string) =>
  fireEvent.press(
    screen.getByRole('button', {
      name: `Change ${slot}: another idea, your own meal or skip`,
    }),
  );

describe('MealTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStorePremium.setState({ premium: false });
    useJourneyStore.setState({ mealsHintDismissed: {} });
  });

  it('creates today’s plan automatically, once, and offers a retry after an error', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan: null, unlockedSlots: [] });
    (generateMealPlan as jest.Mock)
      .mockRejectedValueOnce(new MealPlanError('generation_failed'))
      .mockResolvedValueOnce(plan);
    await timeline();
    expect(
      await screen.findByText(/couldn’t build a plan that fits all your requirements/),
    ).toBeOnTheScreen();
    expect(generateMealPlan).toHaveBeenCalledTimes(1);
    // Logging still works while there's no plan.
    expect(screen.getAllByRole('button', { name: 'Add food to Breakfast' }).length).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Rolled oats', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(screen.getByText('Up next')).toBeOnTheScreen();
  });

  it('does not create plans for other days, and shows their logged food', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan: null, unlockedSlots: [] });
    const yesterday = new Date(today.getTime() - 86_400_000);
    await timeline([planLog('lunch', 'Toast', 300, 'search')], { day: yesterday });
    expect(await screen.findByText('Toast')).toBeOnTheScreen();
    await waitFor(() => expect(loadMealPlan).toHaveBeenCalled());
    expect(generateMealPlan).not.toHaveBeenCalled();
  });

  it('shows later meals folded, never locked, and only the next meal has actions', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await timeline();
    expect(await screen.findByText('Roast chicken plate')).toBeOnTheScreen();
    expect(screen.getAllByText('Later')).toHaveLength(3);
    expect(screen.queryByText('Roast chicken')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^I ate / })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Show the Lunch suggestion' }));
    expect(screen.getByText('Roast chicken')).toBeOnTheScreen();
  });

  it('adapts the next meal to what was eaten and says by how much', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    // 700 of a 1000 kcal target eaten; 616 planned for the rest → portions × 0.6 (the minimum).
    const logs = [planLog('breakfast', 'usda:Rolled oats', 700)];
    await timeline(logs, { targetKcal: 1000 });
    expect(
      await screen.findByText('Adjusted from 248 to 149 kcal to fit what you’ve eaten today.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Done ✓')).toBeOnTheScreen();
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
    await timeline(logs);
    expect(await screen.findByText('All of today’s planned meals are logged 🎉')).toBeOnTheScreen();
    expect(screen.getAllByText('Done ✓')).toHaveLength(4);
    expect(screen.getByText('usda:Lentils')).toBeOnTheScreen();
  });

  it('shows free users the first item and locks the rest behind an opt-in video', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (showRewarded as jest.Mock).mockResolvedValue('earned');
    await timeline();
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
    await timeline();
    expect(await screen.findByText('2 more items hidden')).toBeOnTheScreen();
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: ['breakfast'] });
    await timeline();
    expect(await screen.findByText('Greek yogurt')).toBeOnTheScreen();
  });

  it('shows the whole dish and logs it as one meal with its USDA numbers', async () => {
    useStorePremium.setState({ premium: true });
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await timeline();
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
    await timeline();
    expect(await screen.findByText('⏱ 5 min')).toBeOnTheScreen();
    expect(screen.queryByText('Top with blueberries.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'How to make it (2 steps)' }));
    expect(screen.getByText('Top with blueberries.')).toBeOnTheScreen();
  });

  it('keeps the other choices under “Change” and swaps the dish for another idea', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (mealPlanAction as jest.Mock).mockResolvedValue({
      ...plan,
      slots: { ...plan.slots, breakfast: [item('Eggs', 150)] },
      dishes: { ...plan.dishes, breakfast: { title: 'Scrambled eggs', description: '' } },
    });
    await timeline();
    await screen.findByText('Overnight oats with berries');
    expect(screen.queryByRole('button', { name: 'Another idea' })).toBeNull();
    await openChange('Breakfast');
    await fireEvent.press(screen.getByRole('button', { name: 'Another idea' }));
    expect(await screen.findByText('Scrambled eggs')).toBeOnTheScreen();
    expect(mealPlanAction).toHaveBeenCalledWith(dayKey(today), 'alternative', 'breakfast');
  });

  it('explains when today’s other ideas are used up', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (mealPlanAction as jest.Mock).mockRejectedValue(new MealPlanError('alternative_limit'));
    await timeline();
    await screen.findByText('Overnight oats with berries');
    await openChange('Breakfast');
    await fireEvent.press(screen.getByRole('button', { name: 'Another idea' }));
    expect(await screen.findByText(/You’ve used today’s other ideas/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Get more ideas with Premium' })).toBeOnTheScreen();
  });

  it('skips a meal, moves on to the next one and can undo it', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (mealPlanAction as jest.Mock).mockResolvedValueOnce({ ...plan, skipped: ['breakfast'] });
    await timeline();
    await screen.findByText('Overnight oats with berries');
    await openChange('Breakfast');
    await fireEvent.press(screen.getByRole('button', { name: 'Skip this meal' }));
    expect(await screen.findByText('Skipped')).toBeOnTheScreen();
    expect(mealPlanAction).toHaveBeenCalledWith(dayKey(today), 'skip', 'breakfast');
    expect(screen.getByRole('button', { name: 'I ate Roast chicken plate' })).toBeOnTheScreen();
    (mealPlanAction as jest.Mock).mockResolvedValueOnce(plan);
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(
      await screen.findByRole('button', { name: 'I ate Overnight oats with berries' }),
    ).toBeOnTheScreen();
    expect(mealPlanAction).toHaveBeenLastCalledWith(dayKey(today), 'unskip', 'breakfast');
  });

  it('logs the user’s own meal into the same card, which moves the plan on', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await timeline();
    await screen.findByText('Overnight oats with berries');
    await openChange('Breakfast');
    await fireEvent.press(screen.getByRole('button', { name: 'Log my own meal' }));
    expect(onAdd).toHaveBeenCalledWith('breakfast');
    await timeline([planLog('breakfast', 'Toast', 300, 'search')]);
    // Wait for the plan too: the logged food shows before it has loaded.
    expect(await screen.findByText('Done ✓')).toBeOnTheScreen();
    expect(screen.getByText('Toast')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'I ate Roast chicken plate' })).toBeOnTheScreen();
  });

  it('explains the plan once, until the tip is closed', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await timeline();
    expect(await screen.findByText(/Your AI plan suggests each meal/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Hide this tip' }));
    expect(screen.queryByText(/Your AI plan suggests each meal/)).toBeNull();
  });

  it('swaps one ingredient of the next meal once it is revealed', async () => {
    useStorePremium.setState({ premium: true });
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    (swapIngredient as jest.Mock).mockResolvedValue({
      ...plan,
      slots: { ...plan.slots, breakfast: [item('Skyr', 90), ...plan.slots.breakfast.slice(1)] },
      dishes: {
        ...plan.dishes,
        breakfast: {
          ...plan.dishes!.breakfast!,
          swapped: [{ from: 'Rolled oats', to: 'Skyr' }],
        },
      },
    });
    await timeline();
    await fireEvent.press(await screen.findByRole('button', { name: 'Swap Rolled oats' }));
    await waitFor(() => expect(swapIngredient).toHaveBeenCalledWith(dayKey(today), 'breakfast', 0));
    expect(await screen.findByText('Skyr')).toBeOnTheScreen();
    expect(screen.getByText(/Rolled oats → Skyr/)).toBeOnTheScreen();
  });

  it('offers no swaps while the meal is locked for free users', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan, unlockedSlots: [] });
    await timeline();
    await screen.findByText('Overnight oats with berries');
    expect(screen.queryByRole('button', { name: 'Swap Rolled oats' })).toBeNull();
  });
});
