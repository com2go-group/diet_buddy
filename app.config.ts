import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that depend on the environment. Google Sign-In's config plugin
 * needs the iOS URL scheme (the reversed iOS client ID from Google Cloud), so it is only added
 * once EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is set. AdMob app IDs come from ADMOB_*_APP_ID.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const plugins: ExpoConfig['plugins'] = [...(config.plugins ?? [])];
  if (iosUrlScheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  // AdMob app IDs (docs/setup/admob.md). Until they're set, Google's sample app IDs keep builds
  // working with test ads only.
  plugins.push([
    'react-native-google-mobile-ads',
    {
      androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511',
      // Don't start ad measurement before the UMP consent flow has run (§12).
      delayAppMeasurementInit: true,
    },
  ]);
  return { ...(config as ExpoConfig), plugins };
};
