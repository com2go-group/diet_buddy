import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import type { Enums } from '@/lib/supabase';
import { accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { MEAL_SLOTS, type FoodLog } from '../summary';

const EMOJI: Record<Enums<'meal_slot'>, string> = {
  breakfast: '🥣',
  lunch: '🥗',
  snack: '🍎',
  dinner: '🍽️',
};

/** One row per meal slot: logged items and kcal, or a "Log" button that opens the Meals tab. */
export function TodayMeals({
  meals,
  onLog,
}: {
  meals: Record<Enums<'meal_slot'>, FoodLog[]>;
  onLog: (slot: Enums<'meal_slot'>) => void;
}) {
  const { scheme } = useTheme();
  const green = accentColor('green', scheme);
  return (
    <View className="mb-4 gap-2">
      {MEAL_SLOTS.map((slot) => {
        const items = meals[slot];
        const logged = items.length > 0;
        const kcal = items.reduce((total, f) => total + f.calories, 0);
        const title = t(`homeScreen.${slot}`);
        return (
          <View
            key={slot}
            className={`flex-row items-center gap-3 rounded-2xl border bg-card p-3 ${logged ? 'border-border' : 'border-primary/20'}`}
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Text className="text-xl">{EMOJI[slot]}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text variant="label" className="font-semibold text-[15px]">
                  {title}
                </Text>
                {logged ? (
                  <View className="rounded-full bg-success/10 px-1.5 py-0.5">
                    <Text className="font-bold text-[11px]" style={{ color: green }}>
                      {t('homeScreen.logged')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {logged
                  ? t('homeScreen.mealItems', {
                      names: items.map((f) => f.name).join(', '),
                      kcal: formatNumber(kcal),
                    })
                  : t('homeScreen.notLogged')}
              </Text>
            </View>
            {!logged ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('homeScreen.log')} ${title}`}
                onPress={() => onLog(slot)}
                style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
                className="items-center justify-center rounded-xl bg-primary/10 px-3 active:opacity-70"
              >
                <Text variant="label" tone="primary" className="font-bold">
                  {t('homeScreen.log')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
