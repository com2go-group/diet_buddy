import { View } from 'react-native';

import { Card, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import type { Plan } from '@/lib/nutrition';
import { accentColor, useTheme, type Accent } from '@/theme';

/** Daily Nutrition Plan grid (prototype), with real targets and the actual energy balance. */
export function NutritionCard({ plan }: { plan: Plan }) {
  const { scheme } = useTheme();
  const delta = plan.dailyCalorieDelta;
  const balance =
    Math.abs(delta) < 50
      ? { label: t('initialPlan.maintenance'), value: t('initialPlan.maintenanceValue'), unit: '' }
      : delta < 0
        ? {
            label: t('initialPlan.deficit'),
            value: `−${formatNumber(-delta)}`,
            unit: t('initialPlan.kcalPerDay'),
          }
        : {
            label: t('initialPlan.surplus'),
            value: `+${formatNumber(delta)}`,
            unit: t('initialPlan.kcalPerDay'),
          };

  const tiles: { label: string; value: string; unit: string; accent: Accent }[] = [
    {
      label: t('initialPlan.calories'),
      value: formatNumber(plan.dailyCalories),
      unit: t('initialPlan.kcalPerDay'),
      accent: 'amber',
    },
    {
      label: t('initialPlan.protein'),
      value: `${plan.macros.proteinG}g`,
      unit: t('initialPlan.perDay'),
      accent: 'green',
    },
    {
      label: t('initialPlan.carbs'),
      value: `${plan.macros.carbsG}g`,
      unit: t('initialPlan.perDay'),
      accent: 'blue',
    },
    {
      label: t('initialPlan.fat'),
      value: `${plan.macros.fatG}g`,
      unit: t('initialPlan.perDay'),
      accent: 'violet',
    },
    {
      label: t('initialPlan.fiber'),
      value: `${plan.macros.fiberG}g`,
      unit: t('initialPlan.perDay'),
      accent: 'cyan',
    },
    { ...balance, accent: 'red' },
  ];
  const rows = [tiles.slice(0, 2), tiles.slice(2, 4), tiles.slice(4, 6)];

  return (
    <Card className="gap-3 rounded-3xl">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
          <Text>🍽️</Text>
        </View>
        <Text variant="heading" accessibilityRole="header" className="font-extrabold">
          {t('initialPlan.nutritionTitle')}
        </Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-2.5">
          {row.map((tile) => (
            <View
              key={tile.label}
              accessible
              accessibilityLabel={`${tile.label}: ${tile.value} ${tile.unit}`}
              className="flex-1 rounded-2xl bg-muted p-3"
            >
              <Text variant="caption" tone="muted" className="font-semibold">
                {tile.label}
              </Text>
              <Text
                className="mt-1 font-extrabold text-lg leading-6"
                style={{ color: accentColor(tile.accent, scheme) }}
              >
                {tile.value}
              </Text>
              {tile.unit ? (
                <Text variant="caption" tone="muted" className="text-[11px]">
                  {tile.unit}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}
