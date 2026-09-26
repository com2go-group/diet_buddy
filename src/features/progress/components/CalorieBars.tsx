import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import type { WeekdayKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { accentColor, useTheme } from '@/theme';

const H = 96;

/** Last 7 days of calories as bars against the daily target (dashed line). */
export function CalorieBars({
  days,
  target,
}: {
  days: { key: string; weekday: WeekdayKey; kcal: number | null }[];
  target: number | null;
}) {
  const { scheme, colors } = useTheme();
  const blue = accentColor('blue', scheme);
  const max = Math.max(target ?? 0, ...days.map((d) => d.kcal ?? 0), 1) * 1.1;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${t('progress.weeklyCaloriesChart', { target: formatNumber(target ?? 0) })}: ${days
        .map(
          (d) =>
            `${t(`weekdays.${d.weekday}`)} ${d.kcal === null ? t('progress.none') : formatNumber(d.kcal)}`,
        )
        .join(', ')}`}
    >
      <View style={{ height: H }} className="flex-row items-end gap-2">
        {target ? (
          <View
            className="absolute left-0 right-0 border-t border-dashed"
            style={{ bottom: (target / max) * H, borderColor: colors.mutedForeground }}
          />
        ) : null}
        {days.map((d) => (
          <View key={d.key} className="flex-1 items-center justify-end" style={{ height: H }}>
            <View
              className="w-full rounded-t-md"
              style={{
                height: d.kcal ? Math.max(3, (d.kcal / max) * H) : 3,
                backgroundColor: d.kcal ? blue : colors.muted,
              }}
            />
          </View>
        ))}
      </View>
      <View className="mt-1.5 flex-row gap-2">
        {days.map((d) => (
          <Text
            key={d.key}
            variant="caption"
            tone="muted"
            className="flex-1 text-center text-[11px]"
          >
            {t(`weekdays.${d.weekday}`)}
          </Text>
        ))}
      </View>
      {target ? (
        <Text variant="caption" tone="muted" className="mt-1 text-right text-[11px]">
          - - {t('progress.target', { kcal: formatNumber(target) })}
        </Text>
      ) : null}
    </View>
  );
}
