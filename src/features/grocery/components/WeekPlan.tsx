import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import type { MealPlan } from '../../meals/mealPlanApi';
import { MEAL_SLOTS } from '../../meals/portion';

export function dayName(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** The next 7 days: planned calories per day, expandable to the meals. */
export function WeekPlan({ dates, plans }: { dates: string[]; plans: MealPlan[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const byDate = new Map(plans.map((p) => [p.date, p]));
  return (
    <View className="gap-2">
      {dates.map((date) => {
        const plan = byDate.get(date);
        const day = dayName(date);
        const expanded = open === date;
        return (
          <View key={date} className="rounded-xl border border-border bg-card">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                plan
                  ? t(expanded ? 'grocery.hideMeals' : 'grocery.showMeals', { day })
                  : `${day}, ${t('grocery.notPlanned')}`
              }
              aria-expanded={plan ? expanded : undefined}
              disabled={!plan}
              onPress={() => setOpen(expanded ? null : date)}
              style={{ minHeight: MIN_TOUCH_TARGET }}
              className="flex-row items-center justify-between px-3 py-2"
            >
              <Text className="font-semibold text-[14px]">{day}</Text>
              <View className="flex-row items-center gap-2">
                <Text tone="muted" className="text-[13px]">
                  {plan
                    ? t('grocery.planned', { kcal: formatNumber(plan.totals.kcal) })
                    : t('grocery.notPlanned')}
                </Text>
                {plan ? (
                  <Feather
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.mutedForeground}
                  />
                ) : null}
              </View>
            </Pressable>
            {plan && expanded ? (
              <View className="gap-1 px-3 pb-3">
                {MEAL_SLOTS.map((slot) =>
                  plan.slots[slot].length ? (
                    <Text key={slot} className="text-[13px]">
                      <Text className="font-semibold text-[13px]">{t(`homeScreen.${slot}`)}: </Text>
                      {plan.slots[slot].map((i) => i.name).join(', ')}
                    </Text>
                  ) : null,
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
