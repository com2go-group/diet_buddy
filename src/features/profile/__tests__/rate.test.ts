import { Linking } from 'react-native';

import { openStoreReview } from '../rate';

describe('openStoreReview', () => {
  const open = jest.spyOn(Linking, 'openURL');
  afterEach(() => open.mockReset());

  it('opens the App Store review page', async () => {
    open.mockResolvedValue(true);
    expect(await openStoreReview('ios')).toBe(true);
    expect(open).toHaveBeenCalledWith(
      'itms-apps://apps.apple.com/app/id6816914380?action=write-review',
    );
  });

  it('falls back to the web page when the store app is missing', async () => {
    open.mockRejectedValueOnce(new Error('no handler')).mockResolvedValueOnce(true);
    expect(await openStoreReview('android')).toBe(true);
    expect(open).toHaveBeenLastCalledWith(
      'https://play.google.com/store/apps/details?id=com.com2go.dietbuddy',
    );
  });

  it('has nothing to open on the web', async () => {
    expect(await openStoreReview('web')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
