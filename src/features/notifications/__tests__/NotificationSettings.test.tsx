import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { requestPermission, scheduleReminders } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { renderScreen } from '@/test/render';

import { loadConsents } from '../../profile/api';
import { NotificationSettingsScreen } from '../NotificationSettingsScreen';

jest.mock('@/lib/push', () => ({
  ...jest.requireActual('@/lib/push/reminders'),
  pushSupported: true,
  permission: jest.fn(async () => 'undetermined'),
  requestPermission: jest.fn(async () => 'granted'),
  getPushToken: jest.fn(async () => 'ExponentPushToken[x]'),
  scheduleReminders: jest.fn(async () => undefined),
  onNotificationTap: jest.fn(() => () => {}),
  pushToken: jest.fn(() => null),
}));
jest.mock('../../profile/api', () => ({
  ...jest.requireActual('../../profile/api'),
  loadConsents: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const upsert = jest.fn(async () => ({ data: null, error: null }));
const rpc = jest.fn(async () => ({ data: null, error: null }));
beforeEach(() => {
  jest.clearAllMocks();
  (loadConsents as jest.Mock).mockResolvedValue([]);
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: async () => ({ data: [], error: null }),
    upsert,
  };
  jest.spyOn(supabase, 'from').mockReturnValue(chain as never);
  jest.spyOn(supabase, 'rpc').mockImplementation(rpc as never);
});

describe('NotificationSettingsScreen', () => {
  it('asks for permission, then registers the device and schedules reminders', async () => {
    await renderScreen(<NotificationSettingsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Turn on notifications' }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('register_push_token', {
        p_token: 'ExponentPushToken[x]',
        p_platform: 'ios',
      }),
    );
    expect(requestPermission).toHaveBeenCalled();
    expect((scheduleReminders as jest.Mock).mock.calls[0][0]).toHaveLength(4);
  });

  it('saves a preference and reschedules reminders', async () => {
    await renderScreen(<NotificationSettingsScreen />);
    await fireEvent(await screen.findByLabelText('Meal reminders'), 'valueChange', false);
    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ meal_reminders: false }), {
        onConflict: 'user_id',
      }),
    );
    await waitFor(() =>
      expect((scheduleReminders as jest.Mock).mock.calls.at(-1)[0]).toHaveLength(1),
    );
  });

  it('keeps promotions off without marketing consent', async () => {
    await renderScreen(<NotificationSettingsScreen />);
    expect(await screen.findByLabelText('Offers and new features')).toBeDisabled();
  });
});
