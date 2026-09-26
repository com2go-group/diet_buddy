import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

import type { HomeSummary } from '../summary';

const BAR_MAX = 60;

/** Last 7 days' adherence scores as bars; today is highlighted, days with no data show "–". */
export function WeeklyAdherence({ week }: { week: HomeSummary['week'] }) {
  const { colors } = useTheme();
  return (
    <View className="mb-6 flex-row items-end justify-between gap-2 rounded-2xl border border-border bg-card p-4">
      {week.map((d) => {
        const day = t(`weekdays.${d.weekday}`);
        const label = d.score === null ? '–' : `${d.score}%`;
        return (
          <View
            key={d.key}
            accessible
            accessibilityLabel={t('homeScreen.weeklyDay', {
              day,
              score: d.score === null ? t('homeScreen.noData') : `${d.score}%`,
            })}
            className="flex-1 items-center gap-1.5"
          >
            <Text variant="caption" tone="muted" className="font-bold text-[11px]">
              {label}
            </Text>
            <View
              className={`w-full rounded-t-lg ${d.isToday ? 'bg-primary' : 'bg-muted'}`}
              style={{ height: Math.max(4, ((d.score ?? 0) / 100) * BAR_MAX) }}
            />
            <Text
              variant="caption"
              className="font-semibold"
              style={{ color: d.isToday ? colors.primaryText : colors.mutedForeground }}
            >
              {day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
