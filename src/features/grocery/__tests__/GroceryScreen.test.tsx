import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { generateMealPlan, MealPlanError, type MealPlan } from '../../meals/mealPlanApi';
import { useStorePremium } from '../../subscriptions/usePremium';
import {
  generateGroceryList,
  loadGroceryList,
  loadWeekPlans,
  saveChecked,
  type GroceryList,
} from '../api';
import { GroceryScreen } from '../GroceryScreen';
import { weekDates } from '../useGrocery';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadGroceryList: jest.fn(),
  loadWeekPlans: jest.fn(),
  generateGroceryList: jest.fn(),
  saveChecked: jest.fn(),
}));
jest.mock('../../meals/mealPlanApi', () => ({
  ...jest.requireActual('../../meals/mealPlanApi'),
  generateMealPlan: jest.fn(),
}));
jest.mock('../../account/useProfile', () => ({
  useProfile: () => ({ data: { units: 'metric' } }),
}));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
const dates = weekDates(new Date());
const plan = (date: string): MealPlan => ({
  date,
  slots: {
    breakfast: [
      {
        name: 'Rolled oats',
        foodRef: 'usda:1',
        source: 'Oats',
        grams: 60,
        kcal: 227,
        proteinG: 8,
        carbsG: 40,
        fatG: 4,
      },
    ],
    lunch: [],
    snack: [],
    dinner: [],
  },
  totals: { kcal: 1780, proteinG: 130, carbsG: 180, fatG: 60 },
});
const list: GroceryList = {
  startDate: dates[0]!,
  days: 7,
  currency: 'EUR',
  estimatedCost: 12.4,
  checked: ['usda:1'],
  items: [
    {
      id: 'usda:1',
      name: 'Rolled oats',
      source: 'Oats',
      grams: 420,
      days: 7,
      aisle: 'grains_pasta',
      buy: '500 g bag',
      cost: 1.2,
    },
    {
      id: 'usda:2',
      name: 'Chicken breast',
      source: 'Chicken',
      grams: 1050,
      days: 7,
      aisle: 'meat_fish',
      buy: '2 × 500 g packs',
      cost: 11.2,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
  (loadGroceryList as jest.Mock).mockResolvedValue(null);
  (loadWeekPlans as jest.Mock).mockResolvedValue([plan(dates[0]!), plan(dates[1]!)]);
  (generateMealPlan as jest.Mock).mockImplementation(async (date: string) => plan(date));
  (generateGroceryList as jest.Mock).mockResolvedValue(list);
  (saveChecked as jest.Mock).mockResolvedValue(undefined);
});

describe('GroceryScreen', () => {
  it('plans the missing days, then builds the list', async () => {
    await renderScreen(<GroceryScreen />);
    expect(await screen.findAllByText('1,780 kcal planned')).toHaveLength(2);
    expect(screen.getAllByText('Not planned yet')).toHaveLength(5);
    expect(screen.getByText('No list yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Plan my week & make the list' }));
    await waitFor(() => expect(generateGroceryList).toHaveBeenCalledWith(dates[0], false));
    // Only the five unplanned days are generated, in order.
    expect((generateMealPlan as jest.Mock).mock.calls.map((c) => c[0])).toEqual(dates.slice(2));
    expect(await screen.findByText('Shopping list')).toBeOnTheScreen();
    expect(screen.getByText('Meat & fish')).toBeOnTheScreen();
    expect(screen.getByText('2 × 500 g packs · needs 1.1 kg')).toBeOnTheScreen();
    expect(screen.getByText('Estimated total: €12.40')).toBeOnTheScreen();
    expect(screen.getByText(/rough AI estimates/)).toBeOnTheScreen();
  });

  it('ticks items off and saves them', async () => {
    (loadGroceryList as jest.Mock).mockResolvedValue(list);
    await renderScreen(<GroceryScreen />);
    const oats = await screen.findByRole('checkbox', { name: /Rolled oats/ });
    expect(oats).toBeChecked();
    expect(screen.getByText('1 of 2 ticked')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Chicken breast/ }));
    await waitFor(() =>
      expect(saveChecked).toHaveBeenCalledWith('user-1', dates[0], ['usda:1', 'usda:2']),
    );
    expect(screen.getByText('2 of 2 ticked')).toBeOnTheScreen();
    // With a list, the button updates it.
    await fireEvent.press(screen.getByRole('button', { name: 'Update the list' }));
    await waitFor(() => expect(generateGroceryList).toHaveBeenCalledWith(dates[0], true));
  });

  it('shows a planned day’s meals', async () => {
    await renderScreen(<GroceryScreen />);
    const day = await screen.findAllByRole('button', { name: /^Show meals for/ });
    expect(screen.queryByText(/Rolled oats/)).toBeNull();
    await fireEvent.press(day[0]!);
    expect(screen.getByText(/Rolled oats/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Hide meals for/ })).toBeOnTheScreen();
  });

  it('explains failures while planning', async () => {
    (generateMealPlan as jest.Mock).mockRejectedValue(new MealPlanError('not_configured'));
    await renderScreen(<GroceryScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Plan my week & make the list' }),
    );
    expect(await screen.findByText(/isn’t set up on this server/)).toBeOnTheScreen();
    expect(generateGroceryList).not.toHaveBeenCalled();
  });

  it('is Premium only', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<GroceryScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
    expect(loadWeekPlans).not.toHaveBeenCalled();
  });

  it('shows an error state', async () => {
    (loadGroceryList as jest.Mock).mockRejectedValue(new Error('down'));
    await renderScreen(<GroceryScreen />);
    expect(await screen.findByText('We couldn’t load your list.')).toBeOnTheScreen();
  });
});
