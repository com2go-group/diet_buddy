import { fireEvent, screen } from '@testing-library/react-native';

import { addDays, dayKey } from '@/lib/dates';
import { renderScreen } from '@/test/render';

import { TomorrowPlan } from '../components/TomorrowPlan';
import { generateMealPlan, loadMealPlan, type MealPlan } from '../mealPlanApi';

jest.mock('../mealPlanApi', () => ({
  ...jest.requireActual('../mealPlanApi'),
  loadMealPlan: jest.fn(),
  generateMealPlan: jest.fn(),
}));

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
const today = new Date();
const plan: MealPlan = {
  date: dayKey(addDays(today, 1)),
  slots: {
    breakfast: [item('Oats', 300)],
    lunch: [item('Chicken', 450)],
    snack: [item('Apple', 80)],
    dinner: [item('Lentils', 500)],
  },
  dishes: {
    breakfast: { title: 'Porridge with apple', description: '' },
    lunch: { title: 'Chicken salad', description: '' },
    snack: { title: 'Apple', description: '' },
    dinner: { title: 'Lentil curry', description: '' },
  },
  totals: { kcal: 1330, proteinG: 40, carbsG: 80, fatG: 20 },
};

describe('TomorrowPlan', () => {
  it('plans tomorrow on request and lists its dishes', async () => {
    (loadMealPlan as jest.Mock).mockResolvedValue({ plan: null, unlockedSlots: [] });
    (generateMealPlan as jest.Mock).mockResolvedValue(plan);
    await renderScreen(<TomorrowPlan today={today} />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Plan tomorrow' }, { timeout: 3000 }),
    );
    expect(generateMealPlan).toHaveBeenCalledWith(dayKey(addDays(today, 1)), false);
    expect(await screen.findByText(/Lentil curry/, {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(screen.getByText('500 kcal')).toBeOnTheScreen();
  });
});
