import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { logFood } from '../../meals/api';
import { useStorePremium } from '../../subscriptions/usePremium';
import { analyzeMenu, currentSlot, MenuError, type MenuResult } from '../api';
import { RestaurantScreen } from '../RestaurantScreen';

jest.mock('../api', () => ({ ...jest.requireActual('../api'), analyzeMenu: jest.fn() }));
jest.mock('../../meals/api', () => ({
  ...jest.requireActual('../../meals/api'),
  logFood: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
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
const result: MenuResult = {
  budget: { kcal: 600, proteinG: 42 },
  dishes: [
    {
      name: 'Chicken Caesar salad',
      ingredients: [{ name: 'Grilled chicken', grams: 150, source: 'Chicken, grilled' }],
      estimate: { kcal: 540, proteinG: 54.4, carbsG: 14, fatG: 30 },
      score: 96,
      warnings: [],
    },
    {
      name: 'Chicken satay',
      ingredients: [{ name: 'Satay', grams: 60, source: 'Sauce, peanut' }],
      estimate: { kcal: 400, proteinG: 50, carbsG: 10, fatG: 20 },
      score: 0,
      warnings: ['allergy:peanuts'],
    },
    { name: 'Mystery special', ingredients: [], estimate: null, score: 0, warnings: [] },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
  (analyzeMenu as jest.Mock).mockResolvedValue(result);
  (logFood as jest.Mock).mockResolvedValue(undefined);
});

describe('RestaurantScreen', () => {
  it('ranks typed dishes and logs the chosen one as a restaurant estimate', async () => {
    await renderScreen(<RestaurantScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Type dishes' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Dinner' }));
    await fireEvent.changeText(screen.getByLabelText('Dishes'), 'Caesar salad\nSatay');
    await fireEvent.press(screen.getByRole('button', { name: 'Find my best choice' }));
    expect(await screen.findByText(/Your dinner budget: about 600 kcal/)).toBeOnTheScreen();
    expect(analyzeMenu).toHaveBeenCalledWith(
      { dishes: 'Caesar salad\nSatay' },
      'dinner',
      expect.any(Date),
    );
    expect(screen.getByText(/Best match/)).toBeOnTheScreen();
    expect(
      screen.getByText('May contain peanuts, which you listed as an allergy'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/couldn’t estimate this dish/)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Log this dish to dinner' })[0]!);
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      slot: 'dinner',
      name: 'Chicken Caesar salad',
      quantity: 1,
      unit: 'dish',
      macros: { kcal: 540, proteinG: 54.4, carbsG: 14, fatG: 30 },
      source: 'restaurant',
    });
    expect(await screen.findByRole('button', { name: 'Logged to dinner' })).toBeOnTheScreen();
  });

  it('explains errors and lets the user try again', async () => {
    (analyzeMenu as jest.Mock).mockRejectedValue(new MenuError('not_configured'));
    await renderScreen(<RestaurantScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Type dishes' }));
    await fireEvent.changeText(screen.getByLabelText('Dishes'), 'Pizza');
    await fireEvent.press(screen.getByRole('button', { name: 'Find my best choice' }));
    expect(await screen.findByText(/isn’t set up on this server/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try another menu' }));
    expect(await screen.findByRole('button', { name: 'Find my best choice' })).toBeOnTheScreen();
  });

  it('is Premium only', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<RestaurantScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
  });

  it('picks the meal from the time of day', () => {
    const at = (h: number, m = 0) => new Date(2026, 8, 27, h, m);
    expect(currentSlot(at(8))).toBe('breakfast');
    expect(currentSlot(at(12, 30))).toBe('lunch');
    expect(currentSlot(at(16))).toBe('snack');
    expect(currentSlot(at(20))).toBe('dinner');
  });
});
