import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { healthPlatform } from '@/lib/health';
import { formatNumber } from '@/lib/format';
import { accentColor, useTheme } from '@/theme';

import { platformName } from '../HealthScreen';
import { useHealthStore, useTodayActivity } from '../useHealth';

/** Steps and active energy from the health store; shown on Home when connected. */
export function ActivityCard() {
  const { scheme } = useTheme();
  const connected = useHealthStore((s) => s.connected);
  const query = useTodayActivity();
  if (!connected || !query.data || (query.data.steps === null && query.data.activeKcal === null))
    return null;
  const stats = [
    { label: t('health.steps'), value: query.data.steps, accent: 'green' as const, emoji: '👟' },
    {
      label: t('health.activeKcal'),
      value: query.data.activeKcal,
      accent: 'amber' as const,
      emoji: '🔥',
    },
  ];
  return (
    <View className="mb-4 gap-2 rounded-2xl border border-border bg-card p-4">
      <Text variant="label" accessibilityRole="header" className="font-bold text-[15px]">
        {t('health.todayTitle')}
      </Text>
      <View className="flex-row gap-3">
        {stats.map((s) => (
          <View key={s.label} accessible className="flex-1 flex-row items-center gap-2">
            <Text className="text-xl">{s.emoji}</Text>
            <View>
              <Text
                className="font-extrabold text-lg"
                style={{ color: accentColor(s.accent, scheme) }}
              >
                {s.value === null ? '—' : formatNumber(s.value)}
              </Text>
              <Text variant="caption" tone="muted">
                {s.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {t('health.activityNote', { platform: platformName(healthPlatform) })}
      </Text>
    </View>
  );
}
