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
