import { fireEvent, screen, waitFor } from '@testing-library/react-native';

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
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { is_premium: false }, error: null }) }),
      }),
    }),
  },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const plans: PlanOption[] = [
  { id: 'm', kind: 'monthly', price: '$9.99', perMonth: '$9.99', trialDays: 7, savingPct: null },
  { id: 'a', kind: 'annual', price: '$71.88', perMonth: '$5.99', trialDays: null, savingPct: 40 },
  { id: 'l', kind: 'lifetime', price: '$149.00', perMonth: null, trialDays: null, savingPct: null },
];

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStorePremium.setState({ premium: false });
    (purchasesAvailable as jest.Mock).mockReturnValue(true);
    (getPlans as jest.Mock).mockResolvedValue(plans);
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
    // Unbuilt features are labelled as coming, not sold as included.
    expect(screen.getByText('Coming to Premium')).toBeOnTheScreen();
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

  it('buys the selected plan and shows the premium state', async () => {
    (purchase as jest.Mock).mockResolvedValue(true);
    await renderScreen(<PaywallScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: /Lifetime/ }));
    expect(
      screen.getByText('One-time payment of $149.00. Not a subscription; no renewals.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Get Lifetime Access' }));
    expect(await screen.findByText('You’re Premium 👑')).toBeOnTheScreen();
    expect(purchase).toHaveBeenCalledWith('l');
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

  it('explains when purchases are unavailable (web or not configured)', async () => {
    (purchasesAvailable as jest.Mock).mockReturnValue(false);
    await renderScreen(<PaywallScreen />);
    expect(
      screen.getByText(/available in the DietBuddy app for iPhone and Android/),
    ).toBeOnTheScreen();
  });
});
