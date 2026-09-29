import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Button, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';

import { FormMessage } from '../../auth/components/FormMessage';
import { dishOf, MealPlanError } from '../mealPlanApi';
import { logTimeFor, MEAL_SLOTS } from '../portion';
import {
  adaptFactor,
  adaptItem,
  currentSlot,
  isAdjusted,
  mealTotals,
  slotOutcome,
  slotStates,
} from '../sequence';
import type { FoodLog, MealSlot } from '../types';
import { useLogFood } from '../useMeals';
import { useMealPlan } from '../useMealPlan';
import { LockedMealCard } from './LockedMealCard';
import { MealActions } from './MealActions';
import { MealCard } from './MealCard';

const lower = (slot: MealSlot) => t(`homeScreen.${slot}`).toLowerCase();

const errorText = (e: unknown) =>
  e ? t(`mealPlan.error_${e instanceof MealPlanError ? e.code : 'failed'}`) : undefined;

/**
 * The day's AI meal plan for one meal (CLAUDE.md §7.6): a full dish with its ingredients. Today's
 * plan is made automatically and followed meal by meal (`sequence.ts`): the next suggestion
 * appears once this one is eaten ("I ate this"), replaced by the user's own meal or skipped, and
 * its portions adapt to everything eaten so far. "Another idea" swaps the dish for a different
 * one that still fits the user's diet, restrictions and allergies. Free users see the first
 * ingredient; the rest unlocks with an opt-in rewarded video for that meal or Premium.
 */
export function MealPlanSection({
  day,
  slot,
  isToday,
  logs,
  targetKcal = null,
  onSelectSlot,
}: {
  day: Date;
  slot: MealSlot;
  isToday: boolean;
  logs: FoodLog[];
  targetKcal?: number | null;
  onSelectSlot?: (slot: MealSlot) => void;
}) {
  const { date, query, generate, act, premium, locked, watching, watchToUnlock } = useMealPlan(
    day,
    slot,
  );
  const log = useLogFood();
  const plan = query.data?.plan ?? null;

  // Today's plan is created without a button, once; a failure offers a retry instead of looping.
  const autoTried = useRef(false);
  useEffect(() => {
    if (!isToday || autoTried.current || !query.isSuccess || plan) return;
    autoTried.current = true;
    generate.mutate(false);
  }, [isToday, query.isSuccess, plan, generate]);

  if (query.isPending) return <SkeletonCard lines={2} />;

  if (!plan) {
    if (!isToday) return null;
    return (
      <View className="mb-4 gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          ✨ {generate.isError ? t('mealPlan.createTitle') : t('mealPlan.planning')}
        </Text>
        <Text className="text-[14px]">{t('mealPlan.planningDesc')}</Text>
        <FormMessage message={errorText(generate.error)} />
        {generate.isError ? (
          <Button label={t('mealPlan.retry')} onPress={() => generate.mutate(false)} />
        ) : (
          <SkeletonCard lines={2} />
        )}
      </View>
    );
  }

  const states = isToday ? slotStates(plan, logs) : null;
  const current = isToday ? currentSlot(plan, logs) : null;
  const state = states?.[slot] ?? 'done';
  if (states && state === 'locked' && current) {
    return (
      <LockedMealCard slot={slot} current={current} onGoToCurrent={() => onSelectSlot?.(current)} />
    );
  }

  const dish = dishOf(plan, slot);
  const factor = isToday && state === 'current' ? adaptFactor(plan, logs, targetKcal) : 1;
  const items = (plan.slots[slot] ?? []).map((i) => adaptItem(i, factor));
  const next = MEAL_SLOTS[MEAL_SLOTS.indexOf(slot) + 1];
  const outcome = isToday ? slotOutcome(plan, logs, slot) : null;

  /** "I ate this": the whole meal as one entry, with the (adapted) USDA numbers. */
  const logMeal = () =>
    log.mutate({
      slot,
      loggedAt: logTimeFor(day, slot, new Date()),
      name: dish.title,
      foodRef: `plan:${date}:${slot}`,
      quantity: 1,
      unit: 'meal',
      macros: mealTotals(items),
      source: 'plan',
    });
  const logOwn = () => router.push({ pathname: '/log-food', params: { slot, date: dayKey(day) } });

  const header = !isToday
    ? `✨ ${t('mealPlan.title')}`
    : state === 'current'
      ? `✨ ${t('mealPlan.suggestionTitle', { slot: lower(slot) })}`
      : outcome === 'skipped'
        ? t('mealPlan.skippedTitle', { slot: t(`homeScreen.${slot}`) })
        : t('mealPlan.doneTitle', { slot: t(`homeScreen.${slot}`) });

  return (
    <View className="mb-4 gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label" accessibilityRole="header" className="flex-1 font-bold">
          {header}
        </Text>
        {premium && isToday && state === 'current' ? (
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
      <FormMessage message={errorText(generate.error) ?? errorText(act.error)} />
      {!premium && act.error instanceof MealPlanError && act.error.code === 'alternative_limit' ? (
        <Button
          label={t('mealPlan.moreIdeasPremium')}
          size="md"
          onPress={() => router.push('/paywall')}
        />
      ) : null}
      {state === 'current' && isAdjusted(factor) ? (
        <Text variant="caption" tone="muted">
          {t('mealPlan.adjusted')}
        </Text>
      ) : null}

      {isToday && state === 'done' ? (
        <View className="flex-row items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
          <Text className="flex-1 text-[14px]">
            {outcome === 'ate_plan'
              ? t('mealPlan.outcome_ate_plan', { dish: dish.title })
              : outcome === 'ate_own'
                ? t('mealPlan.outcome_ate_own')
                : t('mealPlan.outcome_skipped')}
          </Text>
          {outcome === 'skipped' ? (
            <Button
              label={t('mealPlan.undoSkip')}
              variant="ghost"
              size="md"
              fullWidth={false}
              loading={act.isPending}
              onPress={() => act.mutate('unskip')}
            />
          ) : null}
        </View>
      ) : (
        <MealCard
          dish={dish}
          items={items}
          locked={locked}
          watching={watching}
          onWatch={watchToUnlock}
        >
          {isToday && state === 'current' ? (
            <MealActions
              title={dish.title}
              hint={next ? t('mealPlan.nextHint', { next: lower(next) }) : t('mealPlan.lastHint')}
              logging={log.isPending}
              asking={act.isPending && act.variables === 'alternative'}
              skipping={act.isPending && act.variables === 'skip'}
              onAte={logMeal}
              onAnother={() => act.mutate('alternative')}
              onOwn={logOwn}
              onSkip={() => act.mutate('skip')}
            />
          ) : null}
        </MealCard>
      )}

      {isToday && current === null ? (
        <Text variant="label" tone="success" className="font-bold">
          {t('mealPlan.allDone')}
        </Text>
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
