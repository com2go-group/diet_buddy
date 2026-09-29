import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { t } from '@/i18n';
import { addDays, dayKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';

import { FormMessage } from '../../auth/components/FormMessage';
import { useSessionStore } from '../../auth/sessionStore';
import { dishOf, generateMealPlan, MealPlanError, type MealPlanDay } from '../mealPlanApi';
import { MEAL_SLOTS } from '../portion';
import { mealTotals } from '../sequence';
import { useMealPlanDay } from '../useMealPlan';

/** Shown from this hour, or earlier once today's meals are all done. */
export const TOMORROW_FROM_HOUR = 17;

/**
 * Tomorrow's plan, the evening before (free and Premium): the four dishes and their calories, so
 * people can shop or prep. The details and portions follow tomorrow, meal by meal.
 */
export function TomorrowPlan({ today }: { today: Date }) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const tomorrow = addDays(today, 1);
  const date = dayKey(tomorrow);
  const queryClient = useQueryClient();
  const query = useMealPlanDay(tomorrow);
  const make = useMutation({
    mutationFn: () => generateMealPlan(date, false),
    onSuccess: (plan) =>
      queryClient.setQueryData<MealPlanDay>(['mealPlan', userId, date], {
        plan,
        unlockedSlots: [],
      }),
  });
  const plan = query.data?.plan ?? null;
  const code = make.error instanceof MealPlanError ? make.error.code : 'failed';

  return (
    <Card className="mb-4 gap-2">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        🌙 {t('mealPlan.tomorrowTitle')}
      </Text>
      {plan ? (
        <View className="gap-1.5">
          {MEAL_SLOTS.map((slot) => (
            <View key={slot} className="flex-row justify-between gap-2">
              <Text className="flex-1 text-[14px]" numberOfLines={2}>
                <Text className="font-semibold text-[14px]">{t(`homeScreen.${slot}`)}: </Text>
                {dishOf(plan, slot).title}
              </Text>
              <Text variant="caption" tone="muted">
                {formatNumber(mealTotals(plan.slots[slot] ?? []).kcal)} kcal
              </Text>
            </View>
          ))}
          <Text variant="caption" tone="muted">
            {t('mealPlan.tomorrowNote')}
          </Text>
        </View>
      ) : (
        <>
          <Text tone="muted" className="text-[14px]">
            {t('mealPlan.tomorrowDesc')}
          </Text>
          <FormMessage message={make.isError ? t(`mealPlan.error_${code}`) : undefined} />
          <Button
            label={t('mealPlan.tomorrowCta')}
            variant="outline"
            size="md"
            loading={make.isPending || query.isPending}
            onPress={() => make.mutate()}
          />
        </>
      )}
    </Card>
  );
}
