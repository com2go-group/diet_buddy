import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { accentColor, useTheme } from '@/theme';

export function HydrationCard({ waterMl }: { waterMl: number }) {
  const { scheme } = useTheme();
  const cyan = accentColor('cyan', scheme);
  const litres = (waterMl / 1000).toFixed(1);
  const glasses = Math.round(waterMl / 250);
  return (
    <View
      accessible
      accessibilityLabel={`${t('initialPlan.hydrationTitle')}: ${t('initialPlan.litresPerDay', { litres })}. ${t('initialPlan.glasses', { count: glasses })}`}
      className="flex-row items-center gap-4 rounded-3xl border border-water/20 bg-water/5 p-4"
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-water/15">
        <Text className="text-2xl leading-8">💧</Text>
      </View>
      <View className="flex-1">
        <Text variant="label" className="font-extrabold">
          {t('initialPlan.hydrationTitle')}
        </Text>
        <Text className="mt-0.5 font-extrabold text-[22px] leading-7" style={{ color: cyan }}>
          {t('initialPlan.litresPerDay', { litres })}
        </Text>
        <Text variant="caption" tone="muted" className="mt-0.5">
          {t('initialPlan.glasses', { count: glasses })}
        </Text>
      </View>
    </View>
  );
}
