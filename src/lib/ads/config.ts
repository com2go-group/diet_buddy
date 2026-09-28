import { Platform } from 'react-native';

/**
 * Ad placements (CLAUDE.md §12). Unit IDs come from EXPO_PUBLIC_ADMOB_* per platform; in
 * development, in test builds (EXPO_PUBLIC_ADMOB_TEST_ADS=true, e.g. TestFlight), or when a unit
 * isn't configured, Google's test units are used so live ads are never requested (or tapped)
 * while testing.
 */
export type Placement = 'banner' | 'interstitial' | 'rewarded';

/** Google's public test units (https://developers.google.com/admob/android/test-ads). */
export const TEST_UNITS: Record<'ios' | 'android', Record<Placement, string>> = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
};

const CONFIGURED: Record<'ios' | 'android', Record<Placement, string | undefined>> = {
  ios: {
    banner: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER,
    interstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL,
    rewarded: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED,
  },
  android: {
    banner: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER,
    interstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL,
    rewarded: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED,
  },
};

const TEST_BUILD = process.env.EXPO_PUBLIC_ADMOB_TEST_ADS === 'true';

export function unitId(
  placement: Placement,
  os = Platform.OS,
  dev = __DEV__ || TEST_BUILD,
): string | null {
  if (os !== 'ios' && os !== 'android') return null;
  const live = CONFIGURED[os][placement];
  return dev || !live ? TEST_UNITS[os][placement] : live;
}

/**
 * Request options shared by every ad. No keywords or content URLs are ever passed, so health data
 * can't reach ad networks (CLAUDE.md §12, §13). iOS always gets non-personalised ads: the app
 * has no App Tracking Transparency prompt, and personalised ads would count as tracking.
 */
export function requestOptions(personalised: boolean, os = Platform.OS) {
  return { requestNonPersonalizedAdsOnly: os === 'ios' || !personalised };
}
