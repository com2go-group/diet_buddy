import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import type { FoodLog } from '../types';

export function portionText(log: Pick<FoodLog, 'quantity' | 'unit'>): string | null {
  if (!log.quantity) return log.unit || null;
  return `${formatDecimal(Number(log.quantity))}${log.unit === 'g' ? ' g' : log.unit ? ` ${log.unit}` : ''}`;
}

/** A logged food with its macros and portion; the bin deletes it. */
export function FoodLogRow({ log, onDelete }: { log: FoodLog; onDelete: () => void }) {
  const { scheme, colors } = useTheme();
  const portion = portionText(log);
  const macros: [string, number, 'green' | 'blue' | 'violet'][] = [
    ['P', log.protein_g, 'green'],
    ['C', log.carbs_g, 'blue'],
    ['F', log.fat_g, 'violet'],
  ];
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card py-2 pl-3 pr-1">
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text variant="label" className="flex-1 font-semibold text-[15px]" numberOfLines={2}>
            {log.name}
          </Text>
          <Text
            variant="label"
            className="font-bold"
            style={{ color: accentColor('amber', scheme) }}
          >
            {formatNumber(Math.round(log.calories))} kcal
          </Text>
        </View>
        <View className="mt-1 flex-row flex-wrap gap-3">
          {macros.map(([label, value, accent]) => (
            <Text
              key={label}
              variant="caption"
              className="font-semibold"
              style={{ color: accentColor(accent, scheme) }}
            >
              {label}: {formatNumber(value)}g
            </Text>
          ))}
          {portion ? (
            <Text variant="caption" tone="muted">
              · {portion}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('meals.deleteItem', { name: log.name })}
        onPress={onDelete}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        className="items-center justify-center rounded-xl active:opacity-60"
      >
        <Feather name="trash-2" size={17} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}
