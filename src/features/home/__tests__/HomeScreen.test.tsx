import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { dayKey } from '@/lib/dates';

import { useSessionStore } from '../../auth/sessionStore';
import { addGlass, loadHome, removeWaterLog } from '../api';
import { HomeScreen } from '../HomeScreen';
import type { HomeData } from '../summary';

jest.mock('../api', () => ({
  loadHome: jest.fn(),
  addGlass: jest.fn(),
  removeWaterLog: jest.fn(),
}));
jest.mock('../../notifications/api', () => ({
  loadNotifications: jest.fn().mockResolvedValue([]),
  markAllRead: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));

const { router } = jest.requireMock('expo-router') as {
  router: { navigate: jest.Mock; push: jest.Mock };
};

const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const now = new Date();
const data: HomeData = {
  profile: { name: 'Olivia', xp: 120, streak_days: 3, units: 'metric' },
  plan: { daily_calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67, water_ml: 2000 },
  food: [
    {
      id: 'f1',
      logged_at: now.toISOString(),
      meal_slot: 'breakfast',
      name: 'Greek yogurt',
      calories: 300,
      protein_g: 25,
      carbs_g: 20,
      fat_g: 8,
    },
  ],
  water: [{ id: 'w1', logged_at: now.toISOString(), ml: 250 }],
  checkins: [],
};

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  await render(
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ session: { user: { id: 'user-1' } } } as never);
    (loadHome as jest.Mock).mockResolvedValue(data);
    (addGlass as jest.Mock).mockResolvedValue(undefined);
    (removeWaterLog as jest.Mock).mockResolvedValue(undefined);
  });

  it('shows today’s totals, meals and streak from the loaded data', async () => {
    await renderScreen();
    expect(await screen.findByText('Olivia')).toBeOnTheScreen();
    expect(screen.getByText(/3 Day Streak/)).toBeOnTheScreen();
    expect(screen.getByText(/120 XP/)).toBeOnTheScreen();
    expect(screen.getByText('Greek yogurt · 300 kcal')).toBeOnTheScreen();
    expect(screen.getByText('0.3 L of 2.0 L daily goal')).toBeOnTheScreen();
    // Unlogged slots offer a Log button that opens the Meals tab.
    await fireEvent.press(screen.getByRole('button', { name: 'Log Lunch' }));
    expect(router.navigate).toHaveBeenCalledWith('/meals');
  });

  it('adds and removes glasses of water', async () => {
    await renderScreen();
    await screen.findByText('Olivia');
    await fireEvent.press(
      screen.getAllByRole('button', { name: 'Add a glass of water (250 ml)' })[0]!,
    );
    await waitFor(() => expect(addGlass).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(loadHome).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove the last glass of water' }));
    await waitFor(() => expect(removeWaterLog).toHaveBeenCalledWith('w1'));
  });

  it('rolls back and explains a failed water save', async () => {
    (addGlass as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderScreen();
    await screen.findByText('Olivia');
    await fireEvent.press(
      screen.getAllByRole('button', { name: 'Add a glass of water (250 ml)' })[0]!,
    );
    expect(await screen.findByText(/That didn’t save/)).toBeOnTheScreen();
    expect(screen.getByText('0.3 L of 2.0 L daily goal')).toBeOnTheScreen();
  });

  it('opens the check-in', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: /Daily Check-In/ }));
    expect(router.push).toHaveBeenCalledWith('/check-in');
  });

  it('shows the check-in as done when today has one', async () => {
    const key = dayKey(new Date());
    (loadHome as jest.Mock).mockResolvedValue({
      ...data,
      checkins: [{ date: key, mood: 'great' }],
    });
    await renderScreen();
    expect(await screen.findByText('Checked in today')).toBeOnTheScreen();
    expect(screen.getByText('Feeling great · see you tomorrow')).toBeOnTheScreen();
  });

  it('shows an error state with retry when loading fails', async () => {
    (loadHome as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await renderScreen();
    expect(await screen.findByText('We couldn’t load your dashboard.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('Olivia')).toBeOnTheScreen();
  });
});
