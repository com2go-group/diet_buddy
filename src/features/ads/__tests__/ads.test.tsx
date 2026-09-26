import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';

import { showRewarded } from '@/lib/ads';
import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import { RewardGate } from '../RewardGate';
import { useAdsStore, useShowAds } from '../useAds';

jest.mock('@/lib/ads', () => ({
  adsSupported: true,
  initAds: jest.fn(),
  openAdPrivacyOptions: jest.fn(),
  showRewarded: jest.fn(),
  showInterstitial: jest.fn(),
}));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: async () => ({ data: [{ id: 'u1' }], error: null }),
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return {
    ...jest.requireActual('@/lib/supabase'),
    supabase: { from: () => chain, rpc: jest.fn(async () => ({ error: null })) },
  };
});

describe('ad gating', () => {
  beforeEach(() => {
    useStorePremium.setState({ premium: false });
    useAdsStore.setState({ consent: null });
  });

  it('shows no ads until consent allows it, and never to Premium users', async () => {
    const { QueryClient, QueryClientProvider } = jest.requireActual('@tanstack/react-query');
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { useSessionStore } = jest.requireActual('../../auth/sessionStore');
    useSessionStore.setState({ session: { user: { id: 'user-1' } } });
    const { result } = await renderHook(() => useShowAds(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(false));
    await act(async () =>
      useAdsStore.setState({
        consent: { canRequestAds: true, personalised: false, privacyOptionsRequired: false },
      }),
    );
    await waitFor(() => expect(result.current).toEqual({ enabled: true, personalised: false }));
    await act(async () => useStorePremium.setState({ premium: true }));
    expect(result.current.enabled).toBe(false);
  });
});

describe('RewardGate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is opt-in: skipping shows the content without an ad', async () => {
    const onDone = jest.fn();
    await renderScreen(
      <RewardGate
        title="Your AI Plan is ready"
        description="d"
        xp={100}
        type="ai_plan"
        target="initial"
        onDone={onDone}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalled();
    expect(showRewarded).not.toHaveBeenCalled();
  });

  it('confirms the XP after a watched video, with SSV data for the server', async () => {
    (showRewarded as jest.Mock).mockResolvedValue('earned');
    const onDone = jest.fn();
    await renderScreen(
      <RewardGate
        title="t"
        description="d"
        xp={100}
        type="ai_plan"
        target="initial"
        onDone={onDone}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Watch video · +100 XP' }));
    expect(await screen.findByText('+100 XP earned! 🎉')).toBeOnTheScreen();
    expect(showRewarded).toHaveBeenCalledWith(
      { userId: 'user-1', type: 'ai_plan', target: 'initial' },
      false,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('still shows the content when no video is available', async () => {
    (showRewarded as jest.Mock).mockResolvedValue('failed');
    const onDone = jest.fn();
    await renderScreen(
      <RewardGate
        title="t"
        description="d"
        xp={50}
        type="meal_plan"
        target="2026-09-27"
        onDone={onDone}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Watch video · +50 XP' }));
    expect(await screen.findByText(/No video is available right now/)).toBeOnTheScreen();
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 3000 });
  });
});
