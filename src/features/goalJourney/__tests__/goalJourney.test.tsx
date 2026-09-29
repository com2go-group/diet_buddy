import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import type { GoalJourney } from '../api';
import { GoalJourneyCard } from '../GoalJourneyCard';
import { journeyState } from '../state';

const mockLoad = jest.fn();
const mockPlan = jest.fn();
const mockApply = jest.fn();
jest.mock('../api', () => ({
  loadGoalJourney: (...a: unknown[]) => mockLoad(...a),
  maintenancePlan: (...a: unknown[]) => mockPlan(...a),
  applyMaintenanceStep: (...a: unknown[]) => mockApply(...a),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const NOW = new Date(2026, 8, 30, 12);
const journey = (over: Partial<GoalJourney> = {}): GoalJourney => ({
  goal: { id: 'g1', goalTypes: ['lose_fat'], goalKg: 70, reachedAt: null },
  plan: { dailyCalories: 1600, generatedBy: 'app', createdAt: '2026-09-01T10:00:00Z' },
  trendKg: 70.1,
  ...over,
});

describe('journeyState', () => {
  it('celebrates when the trend reaches the goal', () => {
    expect(journeyState(journey(), NOW)).toBe('reached');
    expect(journeyState(journey({ trendKg: 71 }), NOW)).toBeNull();
  });
  it('offers the next maintenance step two weeks after the last one', () => {
    const kept = {
      id: 'g1',
      goalTypes: ['healthy_lifestyle' as const],
      goalKg: 70,
      reachedAt: '2026-09-01',
    };
    const step = (createdAt: string) =>
      journeyState(
        journey({
          goal: kept,
          plan: { dailyCalories: 1850, generatedBy: 'maintenance', createdAt },
        }),
        NOW,
      );
    expect(step('2026-09-10T10:00:00Z')).toBe('nextStep');
    expect(step('2026-09-25T10:00:00Z')).toBeNull();
    expect(journeyState(journey({ goal: kept, trendKg: 72.5 }), NOW)).toBe('regain');
  });
  it('shows nothing without a goal or plan', () => {
    expect(journeyState(journey({ goal: null }), NOW)).toBeNull();
    expect(journeyState(journey({ plan: null }), NOW)).toBeNull();
  });
});

describe('GoalJourneyCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('switches to maintenance in a gentle first step', async () => {
    mockLoad.mockResolvedValue(journey());
    mockPlan.mockResolvedValue({
      maintenanceKcal: 2200,
      goals: [],
      step: { plan: { dailyCalories: 1850 } },
    });
    mockApply.mockResolvedValue(1850);
    await renderScreen(<GoalJourneyCard userId="u1" now={NOW} />);
    expect(await screen.findByText(/You reached your goal/)).toBeOnTheScreen();
    expect(await screen.findByText(/1,600 → 1,850 kcal/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Switch to maintenance'));
    await waitFor(() => expect(mockApply).toHaveBeenCalled());
    expect(await screen.findByText(/Your new daily target is 1,850 kcal/)).toBeOnTheScreen();
  });

  it('stays hidden while the goal is still ahead', async () => {
    mockLoad.mockResolvedValue(journey({ trendKg: 75 }));
    await renderScreen(<GoalJourneyCard userId="u1" now={NOW} />);
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    expect(screen.queryByTestId('goal-journey')).toBeNull();
    expect(mockPlan).not.toHaveBeenCalled();
  });
});
