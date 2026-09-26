import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen } from '@/test/render';

import { setConsent } from '../../profile/api';
import { useStorePremium } from '../../subscriptions/usePremium';
import { deleteWellness, fetchWellness, WellnessError, type WellnessResult } from '../api';
import { WellnessScreen } from '../WellnessScreen';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  fetchWellness: jest.fn(),
  deleteWellness: jest.fn(),
}));
jest.mock('../../profile/api', () => ({ setConsent: jest.fn() }));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const ok: WellnessResult = {
  status: 'ok',
  periodStart: '2026-09-14',
  periodEnd: '2026-09-27',
  messagesAnalysed: 8,
  createdAt: '2026-09-27T10:00:00Z',
  insights: [
    { emoji: '🌙', theme: 'sleep', title: 'Short nights', body: 'Poor sleep comes up often.' },
    {
      emoji: '🧘',
      theme: 'stress',
      title: 'Busy days',
      body: 'Work stress shows up in the evenings.',
    },
  ],
};
const fetchMock = fetchWellness as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
  fetchMock.mockResolvedValue(ok);
  (deleteWellness as jest.Mock).mockResolvedValue(undefined);
  (setConsent as jest.Mock).mockResolvedValue(undefined);
});

describe('WellnessScreen', () => {
  it('lists insights with the period and filters them by theme', async () => {
    await renderScreen(<WellnessScreen />);
    expect(await screen.findByText('Short nights')).toBeOnTheScreen();
    expect(screen.getByText(/From 8 of your messages · 14 Sept? – 27 Sept?/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Stress' }));
    expect(screen.queryByText('Short nights')).toBeNull();
    expect(screen.getByText('Busy days')).toBeOnTheScreen();
  });

  it('asks for the separate consent and records it before analysing', async () => {
    fetchMock.mockRejectedValueOnce(new WellnessError('consent_required'));
    await renderScreen(<WellnessScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'I agree, analyse my coach chats' }),
    );
    await waitFor(() => expect(setConsent).toHaveBeenCalledWith('coach_insights', true));
    expect(await screen.findByText('Short nights')).toBeOnTheScreen();
  });

  it('shows professional-help support instead of insights', async () => {
    fetchMock.mockResolvedValue({
      status: 'support',
      flag: 'disordered_eating',
      note: 'It might really help to talk this through with your doctor.',
    });
    await renderScreen(<WellnessScreen />);
    expect(await screen.findByText(/talk this through with your doctor/)).toBeOnTheScreen();
    expect(screen.queryByText('Short nights')).toBeNull();
  });

  it('asks for more chats when there are too few messages', async () => {
    fetchMock.mockResolvedValue({ status: 'not_enough', messageCount: 2, needed: 5 });
    await renderScreen(<WellnessScreen />);
    expect(
      await screen.findByText(/at least 5 of your messages .* You have 2 so far/),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open the coach' }));
    expect(router.push).toHaveBeenCalledWith('/coach');
  });

  it('deletes insights after a second tap and does not fetch again until asked', async () => {
    await renderScreen(<WellnessScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete my insights' }));
    expect(deleteWellness).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Tap again to delete' }));
    expect(await screen.findByText('Insights deleted')).toBeOnTheScreen();
    expect(deleteWellness).toHaveBeenCalledWith('user-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Make new insights' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('is Premium only', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<WellnessScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers a retry on failure', async () => {
    fetchMock.mockRejectedValueOnce(new WellnessError('failed'));
    await renderScreen(<WellnessScreen />);
    expect(await screen.findByText(/couldn’t make your insights/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Short nights')).toBeOnTheScreen();
  });
});
