import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import type { PlannedItem } from '../mealPlanApi';

/** One ingredient of a planned meal, with its USDA numbers. */
export function PlanItemRow({ item }: { item: PlannedItem }) {
  return (
    <View className="flex-row items-center justify-between gap-2 border-t border-border py-2">
      <Text className="flex-1 text-[14px]">{item.name}</Text>
      <Text variant="caption" tone="muted">
        {t('mealPlan.item', { grams: item.grams, kcal: formatNumber(item.kcal) })}
      </Text>
    </View>
  );
}
