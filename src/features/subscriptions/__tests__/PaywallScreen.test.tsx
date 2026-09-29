import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import {
  getPlans,
  purchase,
  PurchaseCancelled,
  purchasesAvailable,
  restore,
  type PlanOption,
} from '@/lib/purchases';
import { renderScreen } from '@/test/render';

import { PaywallScreen } from '../PaywallScreen';
import { useStorePremium } from '../usePremium';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  purchasesAvailable: jest.fn(() => true),
  getPlans: jest.fn(),
  purchase: jest.fn(),
  restore: jest.fn(),
}));
const mockInvoke = jest.fn(async () => ({ data: { premium: true }, error: null }));
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...(args as [])) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { is_premium: false }, error: null }) }),
      }),
    }),
  },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const plans: PlanOption[] = [
  { id: 'm', kind: 'monthly', price: '$9.99', perMonth: '$9.99', trialDays: 7, savingPct: null },
  { id: 'a', kind: 'annual', price: '$71.88', perMonth: '$5.99', trialDays: null, savingPct: 40 },
];

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStorePremium.setState({ premium: false });
    (purchasesAvailable as jest.Mock).mockReturnValue(true);
    (getPlans as jest.Mock).mockResolvedValue(plans);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  it('shows store prices with the annual plan preselected and its renewal terms', async () => {
    await renderScreen(<PaywallScreen />);
    expect(
      await screen.findByRole('radio', { name: /Annual, \$5.99\/mo, \$71.88 per year, Save 40%/ }),
    ).toBeChecked();
    expect(screen.getByRole('button', { name: 'Get Premium Annual' })).toBeOnTheScreen();
    expect(
      screen.getByText(/\$71.88 per year, billed to your .* account. Renews automatically/),
    ).toBeOnTheScreen();
    // Only built features are listed, all as included.
    expect(screen.getByText('Weekly Progress Story to share')).toBeOnTheScreen();
    expect(screen.queryByText('Coming to Premium')).toBeNull();
  });

  it('states the trial terms for the monthly plan', async () => {
    await renderScreen(<PaywallScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: /Monthly/ }));
    expect(screen.getByRole('button', { name: 'Start 7-Day Free Trial' })).toBeOnTheScreen();
    expect(
      screen.getByText(
        /7-day free trial, then \$9.99 per month\. Renews automatically until cancelled/,
      ),
    ).toBeOnTheScreen();
  });

  it('links the Terms and Privacy Policy on dietbuddy.me', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderScreen(<PaywallScreen />);
    await screen.findByRole('radio', { name: /Monthly/ });
    await fireEvent.press(screen.getByRole('link', { name: 'Terms' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Privacy' }));
    expect(open).toHaveBeenCalledWith('https://dietbuddy.me/terms.html');
    expect(open).toHaveBeenCalledWith('https://dietbuddy.me/privacy.html');
  });

  it('buys the selected plan and shows the premium state', async () => {
    (purchase as jest.Mock).mockResolvedValue(true);
    await renderScreen(<PaywallScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: /Monthly/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Start 7-Day Free Trial' }));
    expect(await screen.findByText('You’re Premium 👑')).toBeOnTheScreen();
    expect(purchase).toHaveBeenCalledWith('m');
  });

  it('stays quiet when the user cancels, and explains a failure', async () => {
    (purchase as jest.Mock).mockRejectedValueOnce(new PurchaseCancelled());
    await renderScreen(<PaywallScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Get Premium Annual' }));
    await waitFor(() => expect(purchase).toHaveBeenCalled());
    expect(screen.queryByText(/didn’t go through/)).toBeNull();
    (purchase as jest.Mock).mockRejectedValueOnce(new Error('store'));
    await fireEvent.press(screen.getByRole('button', { name: 'Get Premium Annual' }));
    expect(await screen.findByText(/The purchase didn’t go through/)).toBeOnTheScreen();
  });

  it('restores purchases', async () => {
    (restore as jest.Mock).mockResolvedValue(false);
    await renderScreen(<PaywallScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Restore purchases' }));
    expect(await screen.findByText(/No previous purchases were found/)).toBeOnTheScreen();
  });

  it('leads with the feature the user came for', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ feature: 'coach' });
    await renderScreen(<PaywallScreen />);
    expect(
      await screen.findByText('Unlocks with Premium: Up to 60 AI coach messages a day'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue free' })).toBeNull();
  });

  it('offers the trial once after onboarding, with Continue free', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ welcome: '1' });
    await renderScreen(<PaywallScreen />);
    expect(await screen.findByText('Your plan is ready 🎉')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue free' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('confirms Premium with the server right after buying', async () => {
    (purchase as jest.Mock).mockResolvedValue(true);
    await renderScreen(<PaywallScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Get Premium Annual' }));
    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith('sync-premium', { method: 'POST' }),
    );
  });

  it('explains when purchases are not switched on in this build', async () => {
    (purchasesAvailable as jest.Mock).mockReturnValue(false);
    await renderScreen(<PaywallScreen />);
    expect(screen.getByText(/aren’t switched on in this version/)).toBeOnTheScreen();
  });
});
