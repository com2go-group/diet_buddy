import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatFoodAmount, formatMoney } from '@/lib/format';
import type { UnitSystem } from '@/lib/nutrition';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AISLES, type GroceryList } from '../api';

/** Items grouped by aisle with checkboxes, pack suggestion, weekly amount and rough price. */
export function ShoppingList({
  list,
  units,
  onToggle,
}: {
  list: GroceryList;
  units: UnitSystem;
  onToggle: (checked: string[]) => void;
}) {
  const { colors } = useTheme();
  const checked = new Set(list.checked);
  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onToggle([...next]);
  };
  return (
    <View className="gap-4">
      {AISLES.map((aisle) => {
        const items = list.items.filter((i) => i.aisle === aisle);
        if (!items.length) return null;
        return (
          <View key={aisle} className="gap-1.5">
            <Text variant="label" accessibilityRole="header" className="font-bold">
              {t(`grocery.aisle_${aisle}`)}
            </Text>
            {items.map((item) => {
              const done = checked.has(item.id);
              const amount = t('grocery.needs', { amount: formatFoodAmount(item.grams, units) });
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${item.name}, ${item.buy ?? amount}`}
                  aria-checked={done}
                  onPress={() => toggle(item.id)}
                  style={{ minHeight: MIN_TOUCH_TARGET }}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 active:opacity-80"
                >
                  <View
                    className={
                      done
                        ? 'h-6 w-6 items-center justify-center rounded-md bg-primary-text'
                        : 'h-6 w-6 rounded-md border-2 border-border bg-muted'
                    }
                  >
                    {done ? <Feather name="check" size={14} color={colors.background} /> : null}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-medium text-[15px] leading-5 ${done ? 'line-through' : ''}`}
                      tone={done ? 'muted' : 'default'}
                    >
                      {item.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {item.buy ? `${item.buy} · ${amount}` : amount}
                    </Text>
                  </View>
                  {item.cost !== null ? (
                    <Text tone="muted" className="text-[13px]">
                      ≈ {formatMoney(item.cost, list.currency)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
