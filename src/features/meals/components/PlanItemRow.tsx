import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import type { PlannedItem } from '../mealPlanApi';

/** One planned food with its USDA numbers and "I ate this" (logs it with source `plan`). */
export function PlanItemRow({
  item,
  logged,
  busy,
  onLog,
}: {
  item: PlannedItem;
  logged: boolean;
  busy: boolean;
  onLog: () => void;
}) {
  const { scheme } = useTheme();
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card py-2 pl-3 pr-2">
      <View className="flex-1">
        <Text variant="label" className="font-semibold text-[15px]">
          {item.name}
        </Text>
        <Text variant="caption" tone="muted">
          {t('mealPlan.item', { grams: item.grams, kcal: formatNumber(item.kcal) })} ·{' '}
          <Text variant="caption" style={{ color: accentColor('green', scheme) }}>
            P {formatNumber(item.proteinG)}g
          </Text>
        </Text>
      </View>
      {logged ? (
        <Text variant="caption" tone="success" className="font-bold">
          {t('mealPlan.logged')}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mealPlan.ateItem', { name: item.name })}
          disabled={busy}
          onPress={onLog}
          style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-xl bg-primary/10 px-3 active:opacity-70"
        >
          <Text variant="label" tone="primary" className="font-bold">
            {t('mealPlan.ateThis')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
