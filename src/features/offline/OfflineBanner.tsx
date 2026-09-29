import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';

import { usePendingCount } from './sync';

/** Tells the user their offline logs are safe and will be sent. */
export function OfflineBanner() {
  const count = usePendingCount();
  if (!count) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mb-3 rounded-2xl border border-border bg-muted px-4 py-3"
    >
      <Text className="text-[14px]">☁️ {t('offline.pending', { count })}</Text>
    </View>
  );
}
