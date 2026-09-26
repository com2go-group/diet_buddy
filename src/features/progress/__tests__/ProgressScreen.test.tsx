import { fireEvent, screen } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { loadProgress, type ProgressData } from '../api';
import { ProgressScreen } from '../ProgressScreen';

jest.mock('../api', () => ({ loadProgress: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../notifications/api', () => ({
  loadNotifications: jest.fn().mockResolvedValue([]),
  markAllRead: jest.fn(),
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const data: ProgressData = {
  profile: { streak_days: 4, xp: 100, units: 'metric' },
  plan: { dailyCalories: 1800, proteinG: 140, waterMl: 2000, weeklyChangeKg: -0.5 },
  goal: { startKg: 82, goalKg: 70, types: ['lose_fat'] },
  metrics: [
    { measured_at: daysAgo(20), weight_kg: 82, bmi: 29.1, waist_cm: 92, body_fat_pct: null },
    { measured_at: daysAgo(10), weight_kg: 81.2, bmi: null, waist_cm: null, body_fat_pct: null },
    { measured_at: daysAgo(1), weight_kg: 80.5, bmi: 28.5, waist_cm: 90, body_fat_pct: null },
  ],
  food: [{ logged_at: daysAgo(1), calories: 1750, protein_g: 120 }],
  water: [],
  checkins: [],
  achievements: [
    {
      code: 'clean_eater',
      title: 'Clean Eater',
      description: '5 days within your calorie target',
      emoji: '🥗',
      xp: 80,
      unlockedAt: daysAgo(2),
      current: 5,
      target: 5,
    },
    {
      code: 'protein_pro',
      title: 'Protein Pro',
      description: 'Hit protein target 10 days',
      emoji: '💪',
      xp: 100,
      unlockedAt: null,
      current: 3,
      target: 10,
    },
  ],
};

describe('ProgressScreen', () => {
  beforeEach(() => (loadProgress as jest.Mock).mockResolvedValue(data));

  it('shows totals, trend and projection', async () => {
    await renderScreen(<ProgressScreen />);
    expect(await screen.findByLabelText('Total Lost: 1.5 kg')).toBeOnTheScreen();
    expect(screen.getByLabelText('Streak: 4 days')).toBeOnTheScreen();
    expect(screen.getByText('−1.5 kg in 19 days')).toBeOnTheScreen();
    expect(screen.getByText(/you’d reach 70 kg around/)).toBeOnTheScreen();
    expect(screen.getByText('10.5 kg to go')).toBeOnTheScreen();
  });

  it('shows body metrics with changes', async () => {
    await renderScreen(<ProgressScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Body' }));
    expect(screen.getByLabelText('Waist: 90 cm, −2 cm since first entry')).toBeOnTheScreen();
    expect(screen.getByLabelText('Body Fat: Not measured yet')).toBeOnTheScreen();
  });

  it('lists achievements with progress', async () => {
    await renderScreen(<ProgressScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Achievements' }));
    expect(screen.getByText('1 of 2 unlocked')).toBeOnTheScreen();
    expect(screen.getByText('80 XP earned from achievements')).toBeOnTheScreen();
    expect(screen.getByText('3 / 10')).toBeOnTheScreen();
  });

  it('asks for more data before showing insights', async () => {
    await renderScreen(<ProgressScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Insights' }));
    expect(screen.getByText('Not enough data yet')).toBeOnTheScreen();
  });

  it('shows an error state', async () => {
    (loadProgress as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderScreen(<ProgressScreen />);
    expect(await screen.findByText('We couldn’t load your progress.')).toBeOnTheScreen();
  });
});
