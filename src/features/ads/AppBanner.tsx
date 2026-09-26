import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { AdBanner } from '@/lib/ads/AdBanner';

import { useShowAds } from './useAds';

/** Banner for free users on selected screens (§12); renders nothing for Premium or on web. */
export function AppBanner() {
  const { enabled, personalised } = useShowAds();
  if (!enabled) return null;
  return (
    <View className="items-center">
      <AdBanner personalised={personalised} label={t('ads.label')} />
      <Text
        variant="caption"
        tone="primary"
        accessibilityRole="link"
        className="mb-2 font-semibold"
        onPress={() => router.push('/paywall')}
      >
        {t('ads.removeAds')}
      </Text>
    </View>
  );
}
