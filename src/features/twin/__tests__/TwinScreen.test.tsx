import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import { loadTwin, saveLook, type TwinData } from '../api';
import { TwinScreen } from '../TwinScreen';

jest.mock('../api', () => ({ loadTwin: jest.fn(), saveLook: jest.fn() }));
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
const data: TwinData = {
  look: { variant: 'female', skin: 2, hair: 3 },
  sex: 'female',
  heightCm: 168,
  birthDate: new Date(1992, 1, 3),
  units: 'metric',
  metrics: [
    { measured_at: iso(40), weight_kg: 78, body_fat_pct: null },
    { measured_at: iso(1), weight_kg: 75.5, body_fat_pct: 33.2 },
  ],
  goal: { goalKg: 66, goalDate: null },
  weeklyChangeKg: -0.5,
};

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
  (loadTwin as jest.Mock).mockResolvedValue(data);
  (saveLook as jest.Mock).mockResolvedValue(undefined);
});

describe('TwinScreen', () => {
  it('shows the twin now, with measured body fat and the change since the start', async () => {
    await renderScreen(<TwinScreen />);
    expect(await screen.findByText('75.5 kg · body fat 33.2%')).toBeOnTheScreen();
    expect(screen.getByText('−2.5 kg since your start')).toBeOnTheScreen();
    expect(screen.getByLabelText('Your twin, Now: 75.5 kg · body fat 33.2%')).toBeOnTheScreen();
  });

  it('lets Premium users step through the timeline to the projected goal', async () => {
    await renderScreen(<TwinScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Goal/ }));
    expect(screen.getByText(/^66 kg · body fat about/)).toBeOnTheScreen();
    expect(screen.getByText(/Projected for about .* if you follow your plan\./)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Start/ }));
    expect(screen.getByText(/^78 kg · body fat about .*% \(estimate\)$/)).toBeOnTheScreen();
  });

  it('locks the timeline for free users', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<TwinScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Goal.*🔒$/ }));
    expect(screen.queryByText(/^66 kg/)).toBeNull();
    expect(
      screen.getByText("Your twin's timeline and goal projection are part of Premium."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
  });

  it('saves a new look', async () => {
    await renderScreen(<TwinScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Customise look' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Other' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Skin tone 5' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Hair colour 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save look' }));
    await waitFor(() =>
      expect(saveLook).toHaveBeenCalledWith('user-1', { variant: 'other', skin: 4, hair: 0 }),
    );
  });

  it('asks for a weigh-in when there is none', async () => {
    (loadTwin as jest.Mock).mockResolvedValue({ ...data, metrics: [] });
    await renderScreen(<TwinScreen />);
    expect(await screen.findByText('No weigh-ins yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Do a body check' }));
    expect(router.push).toHaveBeenCalledWith('/body-check');
  });

  it('shows an error state with retry', async () => {
    (loadTwin as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await renderScreen(<TwinScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('75.5 kg · body fat 33.2%')).toBeOnTheScreen();
  });
});
