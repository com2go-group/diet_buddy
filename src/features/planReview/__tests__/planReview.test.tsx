import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { useJourneyStore } from '../../home/journeyStore';
import { savePlanVersion } from '../../profile/api';
import { loadPlanReview } from '../api';
import { PlanCheckCard } from '../PlanCheckCard';
import { reviewDue } from '../usePlanReview';

jest.mock('../api', () => ({ ...jest.requireActual('../api'), loadPlanReview: jest.fn() }));
jest.mock('../../profile/api', () => ({ savePlanVersion: jest.fn(async () => undefined) }));

const NOW = new Date('2026-09-29T12:00:00Z');
const at = (day: number) => new Date(NOW.getTime() - (14 - day) * 86_400_000);
const plan = {
  version: 1,
  daily_calories: 1800,
  protein_g: 130,
  carbs_g: 180,
  fat_g: 60,
  fiber_g: 25,
  water_ml: 2500,
  exercise_recommendation: null,
  forecast: { weekly_change_kg: -0.5 },
};
const review = {
  plan,
  planCreatedAt: '2026-09-01T00:00:00Z',
  input: {
    days: Array.from({ length: 14 }, (_, i) => ({ day: `d${i}`, kcal: 1800 })),
    // No change in 14 days: slower than planned.
    weights: Array.from({ length: 8 }, (_, i) => ({ at: at(i * 2), kg: 80 })),
    currentTarget: 1800,
    plannedWeeklyKg: -0.5,
    floor: 1300,
    weightKg: 80,
  },
};

describe('plan check-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useJourneyStore.setState({ planReviewedAt: {} });
  });

  it('is due two weeks after the plan and after the last answer', () => {
    expect(reviewDue('2026-09-01T00:00:00Z', undefined, NOW)).toBe(true);
    expect(reviewDue('2026-09-20T00:00:00Z', undefined, NOW)).toBe(false);
    expect(reviewDue('2026-09-01T00:00:00Z', '2026-09-25T00:00:00Z', NOW)).toBe(false);
  });

  it('suggests a new target and saves it as a new plan version', async () => {
    (loadPlanReview as jest.Mock).mockResolvedValue(review);
    await renderScreen(<PlanCheckCard now={NOW} />);
    expect(await screen.findByText(/slower than planned/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Update to 1,500 kcal' }));
    await waitFor(() => expect(savePlanVersion).toHaveBeenCalled());
    expect((savePlanVersion as jest.Mock).mock.calls[0][1]).toMatchObject({
      version: 2,
      daily_calories: 1500,
      protein_g: 130,
    });
  });

  it('stays quiet for two weeks after "Not now"', async () => {
    (loadPlanReview as jest.Mock).mockResolvedValue(review);
    await renderScreen(<PlanCheckCard now={NOW} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByText(/slower than planned/)).toBeNull();
  });
});
