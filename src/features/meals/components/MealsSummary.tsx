import { View } from 'react-native';

import { ProgressBar, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { accentColor, useTheme, type Accent } from '@/theme';

import type { Macros } from '../types';

/** Calories eaten vs target, macros and what's left (prototype "Calories Today" card). */
export function MealsSummary({
  eaten,
  targetKcal,
  title,
}: {
  eaten: Macros;
  targetKcal: number | null;
  title: string;
}) {
  const { scheme } = useTheme();
  const left = targetKcal === null ? null : targetKcal - eaten.kcal;
  const stats: { label: string; value: string; accent: Accent }[] = [
    { label: t('macros.protein'), value: `${formatNumber(eaten.proteinG)}g`, accent: 'green' },
    { label: t('macros.carbs'), value: `${formatNumber(eaten.carbsG)}g`, accent: 'blue' },
    { label: t('macros.fat'), value: `${formatNumber(eaten.fatG)}g`, accent: 'violet' },
  ];
  if (left !== null) {
    stats.push({
      label: left >= 0 ? t('meals.remaining') : t('meals.over'),
      value: `${formatNumber(Math.abs(left))} kcal`,
      accent: left >= 0 ? 'amber' : 'red',
    });
  }
  return (
    <View className="mb-4 gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text variant="label" tone="muted" className="font-medium">
          {title}
        </Text>
        <Text variant="label" className="font-bold" style={{ color: accentColor('amber', scheme) }}>
          {targetKcal === null
            ? `${formatNumber(eaten.kcal)} kcal`
            : t('meals.ofTarget', {
                current: formatNumber(eaten.kcal),
                target: formatNumber(targetKcal),
              })}
        </Text>
      </View>
      {targetKcal ? <ProgressBar value={eaten.kcal / targetKcal} label={title} /> : null}
      <View className="flex-row justify-between">
        {stats.map((s) => (
          <View key={s.label} accessible className="items-center">
            <Text className="font-bold text-sm" style={{ color: accentColor(s.accent, scheme) }}>
              {s.value}
            </Text>
            <Text variant="caption" tone="muted" className="text-[11px]">
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
