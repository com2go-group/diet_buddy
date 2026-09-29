import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen } from '@/test/render';

import { FirstDayChecklist } from '../components/FirstDayChecklist';
import { checklistActive, useJourneyStore } from '../journeyStore';
import type { HomeData } from '../summary';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: async () => ({ data: [], error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});

const NOW = new Date('2026-09-29T12:00:00Z');
const data: HomeData = {
  profile: { name: 'Sam', xp: 0, streak_days: 0, streak_freezes: 0, units: 'metric' },
  plan: null,
  food: [],
  water: [{ id: 'w', logged_at: NOW.toISOString(), ml: 250 }],
  checkins: [],
};

describe('FirstDayChecklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useJourneyStore.setState({
      onboardedAt: { u1: '2026-09-29T08:00:00Z' },
      checklistDismissed: {},
    });
  });

  it('shows the first steps with what is done, and goes where each is done', async () => {
    const addGlass = jest.fn();
    await renderScreen(
      <FirstDayChecklist userId="u1" data={data} now={NOW} onAddGlass={addGlass} />,
    );
    expect(await screen.findByText('1 of 4 done')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Drink a glass of water (tap to add it), done' }),
    ).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Log your first meal' }));
    expect(router.navigate).toHaveBeenCalledWith('/meals');
    await fireEvent.press(screen.getByRole('button', { name: 'Do your daily check-in' }));
    expect(router.push).toHaveBeenCalledWith('/check-in');
  });

  it('can be closed, and is gone after 3 days', async () => {
    await renderScreen(
      <FirstDayChecklist userId="u1" data={data} now={NOW} onAddGlass={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Close first steps' }));
    expect(screen.queryByText('Your first steps')).toBeNull();
    expect(checklistActive('2026-09-25T08:00:00Z', NOW)).toBe(false);
    expect(checklistActive(undefined, NOW)).toBe(false);
  });
});
