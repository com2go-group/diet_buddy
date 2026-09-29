import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { AdminError, setPremium, type AdminUserDetail } from '../api';
import { PremiumCard } from '../pages/PremiumCard';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  setPremium: jest.fn(),
}));

const user: AdminUserDetail = {
  user_id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  phone: null,
  created_at: '2026-09-01T10:00:00Z',
  last_sign_in_at: null,
  banned: false,
  name: 'Alex',
  units: 'metric',
  is_premium: false,
  xp: 0,
  streak_days: 0,
  onboarded: null,
  admin_role: null,
  counts: {},
  consents: {},
  tickets: [],
  premium_grants: [
    {
      action: 'grant_premium',
      details: { duration: 'monthly', reason: 'Beta tester', premium: true },
      created_at: '2026-09-20T10:00:00Z',
      admin_email: 'admin@example.com',
    },
  ],
} as AdminUserDetail;

beforeEach(() => jest.clearAllMocks());

describe('PremiumCard', () => {
  it('grants Premium for the chosen time once a reason is given', async () => {
    (setPremium as jest.Mock).mockResolvedValue({
      premium: true,
      expiresAt: '2026-12-29T10:00:00Z',
    });
    await renderScreen(<PremiumCard user={user} canAct />);
    expect(screen.getByText('This user doesn’t have Premium.')).toBeOnTheScreen();
    expect(screen.getByText(/1 month by admin@example.com: Beta tester/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Grant Premium' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: '3 months' }));
    await fireEvent.changeText(
      screen.getByLabelText('Reason (kept in the audit log)'),
      'Influencer review',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Grant Premium' }));
    await waitFor(() =>
      expect(setPremium).toHaveBeenCalledWith(
        user.user_id,
        { duration: 'three_month' },
        'Influencer review',
      ),
    );
    expect(await screen.findByText(/✓ Premium until/)).toBeOnTheScreen();
  });

  it('explains a missing RevenueCat key, and hides the controls from support staff', async () => {
    (setPremium as jest.Mock).mockRejectedValue(new AdminError('not_configured'));
    await renderScreen(<PremiumCard user={user} canAct />);
    await fireEvent.changeText(screen.getByLabelText('Reason (kept in the audit log)'), 'Test');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove granted Premium' }));
    expect(await screen.findByText(/Set REVENUECAT_SECRET_KEY/)).toBeOnTheScreen();
    expect(setPremium).toHaveBeenCalledWith(user.user_id, null, 'Test');

    await renderScreen(<PremiumCard user={user} canAct={false} />);
    expect(screen.queryByRole('button', { name: 'Grant Premium' })).toBeNull();
    expect(screen.getByText(/Beta tester/)).toBeOnTheScreen();
  });
});
