import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET } from '@/theme';

import type { PortionFood } from '../types';

function subtitle(food: PortionFood): string {
  if (food.kind === 'portion')
    return `${food.portionLabel} · ${formatNumber(food.portion.kcal)} kcal`;
  const per100 = t('logFood.per100', { kcal: formatNumber(food.per100g.kcal) });
  return food.brand ? `${food.brand} · ${per100}` : per100;
}

/** Tappable list of foods (search results or recent), each opening the portion picker. */
export function FoodList({
  foods,
  onPick,
}: {
  foods: PortionFood[];
  onPick: (f: PortionFood) => void;
}) {
  return (
    <View className="gap-2">
      {foods.map((food, i) => (
        <Pressable
          key={`${food.ref ?? food.name}-${i}`}
          accessibilityRole="button"
          accessibilityLabel={`${food.name}, ${subtitle(food)}`}
          onPress={() => onPick(food)}
          style={{ minHeight: MIN_TOUCH_TARGET }}
          className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 active:opacity-80"
        >
          <View className="flex-1">
            <Text className="font-medium text-[15px] leading-5" numberOfLines={2}>
              {food.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle(food)}
            </Text>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Feather name="plus" size={16} color="#FFFFFF" />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
