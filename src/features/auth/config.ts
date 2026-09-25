import { Platform } from 'react-native';

/** Which auth options this build offers. See docs/auth.md for setting them up. */
export const authConfig = {
  /** Phone sign-up/sign-in with SMS codes. Needs an SMS provider on the Supabase project. */
  phoneEnabled: process.env.EXPO_PUBLIC_AUTH_PHONE_ENABLED === 'true',
  google: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL,
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL,
};

/** Native Google Sign-In needs a dev build and the web client ID (plus the iOS one on iOS). */
export function isGoogleAvailable(): boolean {
  if (Platform.OS === 'web' || !authConfig.google.webClientId) return false;
  return Platform.OS !== 'ios' || Boolean(authConfig.google.iosClientId);
}
