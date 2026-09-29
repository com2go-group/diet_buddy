import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { renderScreen } from '@/test/render';

import { loadInvite, redeemCode } from '../api';
import { InviteScreen } from '../InviteScreen';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadInvite: jest.fn(),
  redeemCode: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

const base = {
  code: 'ABCD2345',
  joined: 2,
  rewarded: 1,
  referredStatus: null,
  signedUpAt: new Date().toISOString(),
};

describe('InviteScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows and shares the user’s code', async () => {
    (loadInvite as jest.Mock).mockResolvedValue(base);
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await renderScreen(<InviteScreen />);
    expect(await screen.findByText('ABCD2345')).toBeOnTheScreen();
    expect(screen.getByText('2 joined · 1 rewarded')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Share my code' }));
    expect(share.mock.calls[0]![0]).toEqual({ message: expect.stringContaining('ABCD2345') });
  });

  it('lets new users enter a friend’s code and explains refusals', async () => {
    (loadInvite as jest.Mock).mockResolvedValue(base);
    (redeemCode as jest.Mock).mockResolvedValue('own');
    await renderScreen(<InviteScreen />);
    await fireEvent.changeText(await screen.findByLabelText('Friend’s code'), 'abcd2345');
    await fireEvent.press(screen.getByRole('button', { name: 'Use code' }));
    await waitFor(() => expect(redeemCode).toHaveBeenCalledWith('ABCD2345'));
    expect(await screen.findByText(/That’s your own code/)).toBeOnTheScreen();
  });

  it('hides the code field after 14 days or once a code was used', async () => {
    (loadInvite as jest.Mock).mockResolvedValue({
      ...base,
      signedUpAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    });
    await renderScreen(<InviteScreen />);
    await screen.findByText('ABCD2345');
    expect(screen.queryByLabelText('Friend’s code')).toBeNull();
  });
});
