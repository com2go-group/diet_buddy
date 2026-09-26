import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSessionStore } from '../../auth/sessionStore';
import { AlreadyCheckedInError, loadCheckInContext, saveCheckIn } from '../api';
import { CheckInScreen } from '../CheckInScreen';

jest.mock('../api', () => {
  class AlreadyCheckedInError extends Error {}
  return { AlreadyCheckedInError, loadCheckInContext: jest.fn(), saveCheckIn: jest.fn() };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const context = { units: 'metric', latestWeightKg: 80, alreadyCheckedIn: false };

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  await render(
    <QueryClientProvider client={client}>
      <CheckInScreen />
    </QueryClientProvider>,
  );
}

const press = (name: string | RegExp, role: 'button' | 'radio' = 'button') =>
  fireEvent.press(screen.getByRole(role, { name }));

describe('CheckInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ session: { user: { id: 'user-1' } } } as never);
    (loadCheckInContext as jest.Mock).mockResolvedValue(context);
    (saveCheckIn as jest.Mock).mockResolvedValue(undefined);
  });

  it('walks through the five questions and saves the answers', async () => {
    await renderScreen();
    expect(await screen.findByText('How are you feeling today?')).toBeOnTheScreen();
    await press('Great', 'radio');
    await press('Continue');
    await press('9', 'radio');
    expect(screen.getByText(/High energy days/)).toBeOnTheScreen();
    await press('Continue');
    await press('8h', 'radio');
    await press('Continue');
    await press('High', 'radio');
    await press('Continue');
    // Weight is prefilled from the latest reading.
    expect(screen.getByDisplayValue('80')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Weight'), '79.4');
    await press('Complete Check-In 🎉');

    expect(await screen.findByText('Check-in complete!')).toBeOnTheScreen();
    expect(saveCheckIn).toHaveBeenCalledWith(
      'user-1',
      { mood: 'great', energy: 9, sleepHours: 8, hunger: 'high', weightKg: 79.4 },
      expect.any(Date),
    );
    expect(screen.getByText('+20 XP earned!', { exact: false })).toBeOnTheScreen();
    expect(screen.getByText('79.4 kg')).toBeOnTheScreen();
  });

  it('can skip the weight', async () => {
    await renderScreen();
    await screen.findByText('How are you feeling today?');
    for (let i = 0; i < 4; i++) await press('Continue');
    await press('Skip weight');
    expect(await screen.findByText('Check-in complete!')).toBeOnTheScreen();
    expect((saveCheckIn as jest.Mock).mock.calls[0][1].weightKg).toBeNull();
  });

  it('rejects an impossible weight before saving', async () => {
    await renderScreen();
    await screen.findByText('How are you feeling today?');
    for (let i = 0; i < 4; i++) await press('Continue');
    await fireEvent.changeText(screen.getByLabelText('Weight'), '8');
    await press('Complete Check-In 🎉');
    expect(
      screen.getByText('Enter a weight between 30 kg and 350 kg, or skip it.'),
    ).toBeOnTheScreen();
    expect(saveCheckIn).not.toHaveBeenCalled();
  });

  it('uses supportive wording for a tough day', async () => {
    await renderScreen();
    await screen.findByText('How are you feeling today?');
    await press('Tough', 'radio');
    for (let i = 0; i < 4; i++) await press('Continue');
    await press('Complete Check-In 🎉');
    expect(await screen.findByText(/be kind to yourself today/)).toBeOnTheScreen();
  });

  it('shows the already-checked-in state', async () => {
    (loadCheckInContext as jest.Mock).mockResolvedValue({ ...context, alreadyCheckedIn: true });
    await renderScreen();
    expect(await screen.findByText('You’ve already checked in today')).toBeOnTheScreen();
  });

  it('handles a duplicate from another device', async () => {
    (saveCheckIn as jest.Mock).mockRejectedValue(new AlreadyCheckedInError());
    await renderScreen();
    await screen.findByText('How are you feeling today?');
    for (let i = 0; i < 4; i++) await press('Continue');
    await press('Complete Check-In 🎉');
    expect(await screen.findByText('You’ve already checked in today')).toBeOnTheScreen();
  });

  it('shows an error when saving fails', async () => {
    (saveCheckIn as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderScreen();
    await screen.findByText('How are you feeling today?');
    for (let i = 0; i < 4; i++) await press('Continue');
    await press('Complete Check-In 🎉');
    expect(await screen.findByText(/We couldn’t save your check-in/)).toBeOnTheScreen();
  });
});
