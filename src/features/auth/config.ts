import { Platform } from 'react-native';

import { siteLinks } from '@/lib/site';

/** Which auth options this build offers. See docs/auth.md for setting them up. */
export const authConfig = {
  /** Phone sign-up/sign-in with SMS codes. Needs an SMS provider on the Supabase project. */
  phoneEnabled: process.env.EXPO_PUBLIC_AUTH_PHONE_ENABLED === 'true',
  google: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
  /** Legal pages on the website (dietbuddy.me); cleared, the links open the in-app copy. */
  termsUrl: siteLinks.terms as string | undefined,
  privacyUrl: siteLinks.privacy as string | undefined,
};

/** Native Google Sign-In needs a dev build and the web client ID (plus the iOS one on iOS). */
export function isGoogleAvailable(): boolean {
  if (Platform.OS === 'web' || !authConfig.google.webClientId) return false;
  return Platform.OS !== 'ios' || Boolean(authConfig.google.iosClientId);
}
