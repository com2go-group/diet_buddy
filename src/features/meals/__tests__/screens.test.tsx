import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import {
  deleteFoodLog,
  FoodSearchError,
  loadMealsDay,
  loadRecentLogs,
  logFood,
  searchFoods,
} from '../api';
import { LogFoodScreen } from '../LogFoodScreen';
import { MealsScreen } from '../MealsScreen';
import type { FoodLog } from '../types';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadMealsDay: jest.fn(),
  loadRecentLogs: jest.fn(),
  searchFoods: jest.fn(),
  logFood: jest.fn(),
  deleteFoodLog: jest.fn(),
}));
jest.mock('../../notifications/api', () => ({
  loadNotifications: jest.fn().mockResolvedValue([]),
  markAllRead: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({ slot: 'lunch', date: undefined })),
}));

const { router } = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; back: jest.Mock };
};

const log = (over: Partial<FoodLog>): FoodLog => ({
  id: 'l1',
  logged_at: new Date().toISOString(),
  meal_slot: 'breakfast',
  food_ref: null,
  name: 'Oats',
  quantity: 50,
  unit: 'g',
  calories: 190,
  protein_g: 6.5,
  carbs_g: 33,
  fat_g: 3.5,
  source: 'search',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (loadMealsDay as jest.Mock).mockResolvedValue({
    logs: [
      log({}),
      log({
        id: 'l2',
        meal_slot: 'lunch',
        name: 'Chicken salad',
        calories: 420,
        quantity: null,
        unit: null,
      }),
    ],
    targets: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 67 },
  });
  (loadRecentLogs as jest.Mock).mockResolvedValue([log({})]);
  (logFood as jest.Mock).mockResolvedValue(undefined);
  (deleteFoodLog as jest.Mock).mockResolvedValue(undefined);
});

describe('MealsScreen', () => {
  it('shows the day’s totals and the chosen meal’s items', async () => {
    await renderScreen(<MealsScreen />);
    expect(await screen.findByText('610 / 2,000 kcal')).toBeOnTheScreen();
    expect(screen.getByText('1,390 kcal')).toBeOnTheScreen(); // remaining
    await fireEvent.press(screen.getByRole('tab', { name: /Breakfast/ }));
    expect(screen.getByText('Oats')).toBeOnTheScreen();
    expect(screen.getByText('190 of 500 kcal')).toBeOnTheScreen();
    expect(screen.getByText('· 50 g')).toBeOnTheScreen();
  });

  it('deletes an item', async () => {
    await renderScreen(<MealsScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: /Breakfast/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Oats' }));
    await waitFor(() => expect(deleteFoodLog).toHaveBeenCalledWith('l1'));
  });

  it('shows an empty meal and opens logging for it', async () => {
    await renderScreen(<MealsScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Dinner' }));
    expect(screen.getByText('Nothing logged yet')).toBeOnTheScreen();
    expect(screen.getByText('Target: 700 kcal')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '+ Add food' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/log-food',
      params: expect.objectContaining({ slot: 'dinner' }),
    });
  });

  it('shows an error state', async () => {
    (loadMealsDay as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderScreen(<MealsScreen />);
    expect(await screen.findByText('We couldn’t load your meals.')).toBeOnTheScreen();
  });
});

describe('LogFoodScreen', () => {
  const chicken = {
    ref: 'usda:171077',
    name: 'Chicken, breast, roasted',
    brand: null,
    per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0 },
    servings: [{ label: '1 small breast (118 g)', grams: 118 }],
  };

  it('searches, picks a portion and logs it to the chosen meal', async () => {
    (searchFoods as jest.Mock).mockResolvedValue([chicken]);
    await renderScreen(<LogFoodScreen />);
    await fireEvent.changeText(screen.getByLabelText('Search foods'), 'chicken');
    await fireEvent.press(await screen.findByRole('button', { name: /Chicken, breast, roasted/ }));
    expect(searchFoods).toHaveBeenCalledWith('chicken');
    // Defaults to the first serving; switch to grams and enter 150.
    expect(screen.getByText('195')).toBeOnTheScreen(); // 118 g → 195 kcal
    await fireEvent.press(screen.getByRole('radio', { name: 'grams' }));
    await fireEvent.changeText(screen.getByLabelText('Amount'), '150');
    expect(screen.getByText('248')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Add to Lunch' }));
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      slot: 'lunch',
      name: 'Chicken, breast, roasted',
      foodRef: 'usda:171077',
      quantity: 150,
      unit: 'g',
      macros: { kcal: 248, proteinG: 46.5, carbsG: 0, fatG: 5.4 },
      source: 'search',
    });
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('offers recent foods before searching', async () => {
    await renderScreen(<LogFoodScreen />);
    expect(await screen.findByRole('button', { name: /Oats/ })).toBeOnTheScreen();
  });

  it('explains when search is not configured on the server', async () => {
    (searchFoods as jest.Mock).mockRejectedValue(new FoodSearchError('not_configured'));
    await renderScreen(<LogFoodScreen />);
    await fireEvent.changeText(screen.getByLabelText('Search foods'), 'apple');
    expect(await screen.findByText(/isn’t set up on this server/)).toBeOnTheScreen();
  });

  it('validates and saves a manual entry', async () => {
    await renderScreen(<LogFoodScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Manual entry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add to Lunch' }));
    expect(screen.getAllByText('This field is required')).toHaveLength(2);
    expect(logFood).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Protein bar');
    await fireEvent.changeText(screen.getByLabelText('Calories (kcal)'), '210');
    await fireEvent.changeText(screen.getByLabelText('Protein (g)'), '20');
    await fireEvent.press(screen.getByRole('tab', { name: 'Dinner' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add to Dinner' }));
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      slot: 'dinner',
      name: 'Protein bar',
      foodRef: null,
      macros: { kcal: 210, proteinG: 20, carbsG: 0, fatG: 0 },
      source: 'manual',
    });
  });
});
