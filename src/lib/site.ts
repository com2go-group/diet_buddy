/**
 * The public website (the `landing/` folder, hosted at dietbuddy.me) and its legal pages. These
 * are the URLs given to the stores. EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TERMS_URL override the
 * legal pages, e.g. for a staging site.
 */
export const SITE_URL = 'https://dietbuddy.me';

export const siteLinks = {
  home: SITE_URL,
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || `${SITE_URL}/privacy.html`,
  terms: process.env.EXPO_PUBLIC_TERMS_URL || `${SITE_URL}/terms.html`,
  deleteAccount: `${SITE_URL}/delete-account.html`,
};

/** App Store app ID (App Store Connect → App Information) and the Android package name. */
export const APP_STORE_ID = '6816914380';
export const ANDROID_PACKAGE = 'com.com2go.dietbuddy';

/** Where "Rate DietBuddy" goes: the store's review page, app first, then the web page. */
export const storeReviewLinks = {
  ios: [
    `itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`,
    `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`,
  ],
  android: [
    `market://details?id=${ANDROID_PACKAGE}`,
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  ],
};
