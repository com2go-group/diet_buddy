import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { adsSupported } from '@/lib/ads';
import { formatNumber } from '@/lib/format';
import { accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import { MealPlanError, type PlannedItem } from '../mealPlanApi';
import { logTimeFor } from '../portion';
import type { FoodLog, MealSlot } from '../types';
import { useLogFood } from '../useMeals';
import { useMealPlan } from '../useMealPlan';

/**
 * The day's AI plan for one meal (CLAUDE.md §7.6). Free users see the first item of each meal;
 * the rest of a meal unlocks with an opt-in rewarded video for that meal (+15 XP) or Premium.
 */
export function MealPlanSection({
  day,
  slot,
  isToday,
  logs,
}: {
  day: Date;
  slot: MealSlot;
  isToday: boolean;
  logs: FoodLog[];
}) {
  const { scheme } = useTheme();
  const { query, generate, premium, locked, watching, watchToUnlock } = useMealPlan(day, slot);
  const log = useLogFood();
  const errorCode =
    generate.error instanceof MealPlanError
      ? generate.error.code
      : generate.error
        ? 'failed'
        : null;
  const error = errorCode ? <FormMessage message={t(`mealPlan.error_${errorCode}`)} /> : null;

  if (query.isPending) return <SkeletonCard lines={2} />;
  const plan = query.data?.plan ?? null;

  if (!plan) {
    if (!isToday) return null;
    return (
      <View className="mb-4 gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          ✨ {t('mealPlan.createTitle')}
        </Text>
        <Text className="text-[14px]">{t('mealPlan.createDesc')}</Text>
        {error}
        <Button
          label={generate.isPending ? t('mealPlan.creating') : t('mealPlan.create')}
          loading={generate.isPending}
          onPress={() => generate.mutate(false)}
        />
      </View>
    );
  }

  const items = plan.slots[slot] ?? [];
  const visible = locked ? items.slice(0, 1) : items;
  const hidden = items.length - visible.length;
  const isLogged = (i: PlannedItem) =>
    logs.some((l) => l.source === 'plan' && l.food_ref === i.foodRef && l.meal_slot === slot);

  return (
    <View className="mb-4 gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label" accessibilityRole="header" className="font-bold">
          ✨ {t('mealPlan.title')}
        </Text>
        {premium && isToday ? (
          <Button
            label={t('mealPlan.regenerate')}
            variant="ghost"
            size="md"
            fullWidth={false}
            loading={generate.isPending}
            onPress={() => generate.mutate(true)}
          />
        ) : null}
      </View>
      {error}
      {visible.map((item) => {
        const logged = isLogged(item);
        return (
          <View
            key={`${item.foodRef}-${item.name}`}
            className="flex-row items-center gap-2 rounded-2xl border border-border bg-card py-2 pl-3 pr-2"
          >
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
                accessibilityLabel={t('mealPlan.logItem', { name: item.name })}
                disabled={log.isPending}
                onPress={() =>
                  log.mutate({
                    slot,
                    loggedAt: logTimeFor(day, slot, new Date()),
                    name: item.name,
                    foodRef: item.foodRef,
                    quantity: item.grams,
                    unit: 'g',
                    macros: {
                      kcal: item.kcal,
                      proteinG: item.proteinG,
                      carbsG: item.carbsG,
                      fatG: item.fatG,
                    },
                    source: 'plan',
                  })
                }
                style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
                className="items-center justify-center rounded-xl bg-primary/10 px-3 active:opacity-70"
              >
                <Text variant="label" tone="primary" className="font-bold">
                  {t('mealPlan.log')}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {hidden > 0 ? (
        <View className="gap-2">
          {Array.from({ length: hidden }, (_, i) => (
            <View
              key={i}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-muted p-3 opacity-70"
            >
              <Text>🔒</Text>
              <View className="h-3 flex-1 rounded-full bg-border" />
            </View>
          ))}
          <View className="gap-2 rounded-2xl border-[1.5px] border-primary/35 bg-primary/10 p-3.5">
            <Text variant="label" className="font-bold" accessibilityLiveRegion="polite">
              {t('mealPlan.hidden', { count: hidden })}
            </Text>
            {adsSupported ? (
              <Button
                label={watching ? t('mealPlan.watching') : t('mealPlan.watch')}
                loading={watching}
                size="md"
                onPress={watchToUnlock}
              />
            ) : null}
            <Button
              label={t('mealPlan.unlockPremium')}
              variant={adsSupported ? 'ghost' : 'primary'}
              size="md"
              onPress={() => router.push('/paywall')}
            />
          </View>
        </View>
      ) : null}
      <Text variant="caption" tone="muted">
        {t('mealPlan.totals', {
          kcal: formatNumber(plan.totals.kcal),
          protein: formatNumber(plan.totals.proteinG),
        })}{' '}
        · {t('mealPlan.note')}
      </Text>
    </View>
  );
}
