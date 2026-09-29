import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import type { PlannedItem } from '../mealPlanApi';

/**
 * One ingredient of a planned meal, with its USDA numbers. The meal that's up next can swap an
 * ingredient for another that fits the user's diet (`onSwap`).
 */
export function PlanItemRow({
  item,
  onSwap,
  swapping = false,
}: {
  item: PlannedItem;
  onSwap?: () => void;
  swapping?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between gap-2 border-t border-border py-1">
      <Text className="flex-1 text-[14px]">{item.name}</Text>
      <Text variant="caption" tone="muted">
        {t('mealPlan.item', { grams: item.grams, kcal: formatNumber(item.kcal) })}
      </Text>
      {onSwap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mealPlan.swapA11y', { name: item.name })}
          aria-busy={swapping}
          disabled={swapping}
          onPress={onSwap}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center active:opacity-60"
        >
          {swapping ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Feather name="repeat" size={16} color={colors.primaryText} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
