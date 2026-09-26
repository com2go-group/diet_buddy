import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import type { TwinData } from '../../twin/api';
import { loadStory, type StoryData } from '../api';
import { shareStoryImage } from '../shareImage';
import { StoryScreen } from '../StoryScreen';

jest.mock('../api', () => ({ loadStory: jest.fn() }));
jest.mock('../shareImage', () => ({ shareStoryImage: jest.fn() }));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const twin: TwinData = {
  look: { variant: 'male', skin: 1, hair: 1 },
  sex: 'male',
  heightCm: 180,
  birthDate: new Date(1990, 3, 12),
  units: 'metric',
  metrics: [
    { measured_at: iso(10), weight_kg: 82, body_fat_pct: null },
    { measured_at: iso(1), weight_kg: 81.2, body_fat_pct: null },
  ],
  goal: null,
  weeklyChangeKg: null,
};
const data: StoryData = {
  twin,
  input: {
    now: new Date(),
    targets: { calories: 2000, proteinG: 120, waterMl: 2000 },
    food: [{ logged_at: iso(1), calories: 1950, protein_g: 110 }],
    water: [{ logged_at: iso(1), ml: 2000 }],
    checkins: [],
    weights: twin.metrics,
    badges: [{ title: 'Hydrated', emoji: '💧', unlockedAt: iso(1) }],
    streakDays: 9,
    xp: 120,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
  (loadStory as jest.Mock).mockResolvedValue(data);
  (shareStoryImage as jest.Mock).mockResolvedValue('shared');
});

describe('StoryScreen', () => {
  it('previews the week with weight hidden by default', async () => {
    await renderScreen(<StoryScreen />);
    expect(
      await screen.findByLabelText(
        /9-day streak, 1 of 7 days logged, 1 days on target, 1 water goal days/,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(/check-ins\. New: 💧 Hydrated$/)).toBeOnTheScreen();
    await fireEvent(
      screen.getByRole('switch', { name: 'Show weight change' }),
      'valueChange',
      true,
    );
    expect(
      screen.getByLabelText(/check-ins\. ⚖️ −0.8 kg this week New: 💧 Hydrated$/),
    ).toBeOnTheScreen();
  });

  it('shares the image for Premium users', async () => {
    await renderScreen(<StoryScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Share image' }));
    await waitFor(() => expect(shareStoryImage).toHaveBeenCalled());
  });

  it('shows an error when the image fails', async () => {
    (shareStoryImage as jest.Mock).mockRejectedValue(new Error('timeout'));
    await renderScreen(<StoryScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Share image' }));
    expect(
      await screen.findByText(/Couldn't create the image\. Please try again\./),
    ).toBeOnTheScreen();
  });

  it('offers Premium instead of sharing to free users', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<StoryScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
    expect(screen.queryByRole('button', { name: 'Share image' })).toBeNull();
  });

  it('asks for a log when the week is empty', async () => {
    (loadStory as jest.Mock).mockResolvedValue({
      ...data,
      input: { ...data.input, food: [], water: [], badges: [] },
    });
    await renderScreen(<StoryScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Log food' }));
    expect(router.push).toHaveBeenCalledWith('/log-food');
  });
});
