import { requestOptions, TEST_UNITS, unitId } from '../config';

describe('ad config', () => {
  it('always uses Google test units in development', () => {
    expect(unitId('rewarded', 'ios', true)).toBe(TEST_UNITS.ios.rewarded);
    expect(unitId('banner', 'android', true)).toBe(TEST_UNITS.android.banner);
  });

  it('falls back to test units when a live unit is not configured, and has none on web', () => {
    expect(unitId('interstitial', 'android', false)).toBe(TEST_UNITS.android.interstitial);
    expect(unitId('banner', 'web', false)).toBeNull();
  });

  it('never sends targeting data, only the personalisation choice', () => {
    expect(requestOptions(false, 'android')).toEqual({ requestNonPersonalizedAdsOnly: true });
    expect(requestOptions(true, 'android')).toEqual({ requestNonPersonalizedAdsOnly: false });
  });

  it('never requests personalised ads on iOS (no App Tracking Transparency prompt)', () => {
    expect(requestOptions(true, 'ios')).toEqual({ requestNonPersonalizedAdsOnly: true });
    expect(requestOptions(false, 'ios')).toEqual({ requestNonPersonalizedAdsOnly: true });
  });
});
