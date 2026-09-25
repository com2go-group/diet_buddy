import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that depend on the environment. Google Sign-In's config plugin
 * needs the iOS URL scheme (the reversed iOS client ID from Google Cloud), so it is only added
 * once EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is set.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const plugins: ExpoConfig['plugins'] = [...(config.plugins ?? [])];
  if (iosUrlScheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  return { ...(config as ExpoConfig), plugins };
};
