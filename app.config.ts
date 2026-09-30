import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withGradleProperties, type ConfigPlugin } from 'expo/config-plugins';

/**
 * react-native-google-mobile-ads 17.2 crashes the Android build when app.json has no
 * "react-native-google-mobile-ads" section (its app-json.gradle sets a misspelled property, then
 * build.gradle reads `googleMobileAdsJson`). Setting its RNGMA_ANDROID_BACKEND property skips that
 * lookup; "classic" is the library's default backend. Our AdMob settings come from the config
 * plugin below.
 */
const withAdsAndroidBackend: ConfigPlugin = (cfg) =>
  withGradleProperties(cfg, (c) => {
    c.modResults = c.modResults.filter(
      (p) => !(p.type === 'property' && p.key === 'RNGMA_ANDROID_BACKEND'),
    );
    c.modResults.push({ type: 'property', key: 'RNGMA_ANDROID_BACKEND', value: 'classic' });
    return c;
  });

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
  return withAdsAndroidBackend({ ...(config as ExpoConfig), plugins });
};
