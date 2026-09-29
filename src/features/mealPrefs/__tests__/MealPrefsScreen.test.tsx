import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { loadMealPrefs, saveMealPrefs, DEFAULT_MEAL_PREFS } from '../api';
import { MealPrefsScreen } from '../MealPrefsScreen';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadMealPrefs: jest.fn(),
  saveMealPrefs: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

describe('MealPrefsScreen', () => {
  it('saves cooking time, budget, cuisines and leftovers', async () => {
    (loadMealPrefs as jest.Mock).mockResolvedValue(DEFAULT_MEAL_PREFS);
    await renderScreen(<MealPrefsScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Quick (15 min)' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Low' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Greek' }));
    await fireEvent(screen.getByLabelText('Cook once, eat twice'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Save preferences' }));
    await waitFor(() =>
      expect(saveMealPrefs).toHaveBeenCalledWith('user-1', {
        cooking_time: 'quick',
        food_budget: 'low',
        cuisines: ['greek'],
        leftovers: true,
      }),
    );
    expect(await screen.findByText(/Your next plan will follow them/)).toBeOnTheScreen();
  });
});
