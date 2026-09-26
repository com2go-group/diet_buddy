// jest.mock factories are hoisted and must use require().
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Native store SDK: not available in Jest. Tests that need purchases mock '@/lib/purchases'.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(() => Promise.resolve()),
    logIn: jest.fn(() => Promise.resolve({})),
    logOut: jest.fn(() => Promise.resolve({})),
    getOfferings: jest.fn(() => Promise.resolve({ current: null, all: {} })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { WARN: 'WARN' },
}));

// AdMob: native only. Feature tests mock '@/lib/ads' when they need ad behaviour.
jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: jest.fn(() => Promise.resolve([])) }),
  AdsConsent: {
    gatherConsent: jest.fn(() => Promise.resolve({ canRequestAds: false })),
    getConsentInfo: jest.fn(() =>
      Promise.resolve({ canRequestAds: false, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }),
    ),
    getUserChoices: jest.fn(() => Promise.resolve({ selectPersonalisedAds: false })),
    showPrivacyOptionsForm: jest.fn(() => Promise.resolve({})),
  },
  InterstitialAd: { createForAdRequest: jest.fn() },
  RewardedAd: { createForAdRequest: jest.fn() },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
  BannerAd: () => null,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
}));
