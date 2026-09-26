import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { renderScreen } from '@/test/render';

import AdminLayout from '../../../../app/admin/_layout';
import { adminMe, atLeast, mfaState, qrDataUrl, setConfig, listConfig } from '../api';
import { SettingsPage } from '../pages/SettingsPage';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  adminMe: jest.fn(),
  mfaState: jest.fn(),
  enrollTotp: jest.fn(async () => ({ factorId: 'f1', qr: 'data:x', secret: 'ABC' })),
  verifyTotp: jest.fn(),
  listConfig: jest.fn(),
  setConfig: jest.fn(),
}));
jest.mock('expo-router', () => ({
  Slot: () => null,
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => '/admin',
}));

const original = Platform.OS;
beforeAll(() => Object.defineProperty(Platform, 'OS', { get: () => 'web' }));
afterAll(() => Object.defineProperty(Platform, 'OS', { get: () => original }));
beforeEach(() => jest.clearAllMocks());

describe('admin gate', () => {
  it('refuses non-admins', async () => {
    (adminMe as jest.Mock).mockResolvedValue(null);
    await renderScreen(<AdminLayout />);
    expect(await screen.findByText('This account doesn’t have admin access.')).toBeOnTheScreen();
  });

  it('asks admins for their authenticator code until the session is verified', async () => {
    (adminMe as jest.Mock).mockResolvedValue({ role: 'admin', mfaVerified: false });
    (mfaState as jest.Mock).mockResolvedValue({ factorId: 'f1', verified: true });
    await renderScreen(<AdminLayout />);
    expect(await screen.findByText(/Enter the 6-digit code/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('shows the dashboard with the role’s pages', async () => {
    (adminMe as jest.Mock).mockResolvedValue({ role: 'support', mfaVerified: true });
    await renderScreen(<AdminLayout />);
    expect(await screen.findByRole('link', { name: 'Safety' })).toBeOnTheScreen();
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  });
});

describe('settings', () => {
  it('saves typed values as JSON and shows the database’s reason for a refusal', async () => {
    (listConfig as jest.Mock).mockResolvedValue([
      {
        key: 'coach_daily_message_limit_free',
        value: 5,
        description: null,
        created_at: '',
        updated_at: '',
      },
      {
        key: 'ai_monthly_budget_usd',
        value: null,
        description: null,
        created_at: '',
        updated_at: '',
      },
      { key: 'feature_barcode', value: true, description: null, created_at: '', updated_at: '' },
    ]);
    const { AdminError } = jest.requireActual('../api');
    (setConfig as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new AdminError('a positive amount or null (no cap) is required'));
    await renderScreen(<SettingsPage />);
    await fireEvent.changeText(await screen.findByLabelText('Free coach messages per day'), '8');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Save' })[0]!);
    await waitFor(() =>
      expect(setConfig).toHaveBeenCalledWith('coach_daily_message_limit_free', 8),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Monthly AI budget (USD, empty = no cap)'),
      '-5',
    );
    await fireEvent.press(screen.getAllByRole('button', { name: 'Save' })[2]!);
    expect(await screen.findByText(/a positive amount or null/)).toBeOnTheScreen();
    expect(screen.getByText('barcode')).toBeOnTheScreen();
  });
});

describe('helpers', () => {
  it('ranks roles and encodes GoTrue QR codes', () => {
    expect(atLeast('owner', 'admin')).toBe(true);
    expect(atLeast('support', 'admin')).toBe(false);
    expect(atLeast(null, 'support')).toBe(false);
    expect(qrDataUrl('data:image/svg+xml;utf-8,<svg a="1"/>')).toBe(
      'data:image/svg+xml;charset=utf-8,%3Csvg%20a%3D%221%22%2F%3E',
    );
  });
});
