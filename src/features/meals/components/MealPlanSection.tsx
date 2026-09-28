import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Button, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import { FormMessage } from '../../auth/components/FormMessage';
import { MealPlanError, type PlannedItem } from '../mealPlanApi';
import { logTimeFor, MEAL_SLOTS } from '../portion';
import { adaptFactor, adaptItem, currentSlot, isAdjusted, slotStates } from '../sequence';
import type { FoodLog, MealSlot } from '../types';
import { useLogFood } from '../useMeals';
import { useMealPlan } from '../useMealPlan';
import { HiddenPlanItems } from './HiddenPlanItems';
import { LockedMealCard } from './LockedMealCard';
import { PlanItemRow } from './PlanItemRow';

const lower = (slot: MealSlot) => t(`homeScreen.${slot}`).toLowerCase();

/**
 * The day's AI meal plan for one meal (CLAUDE.md §7.6). Today's plan is made automatically and
 * followed meal by meal: a meal's suggestion appears once the previous one is logged from the
 * plan, and its portions adapt to everything eaten so far (`sequence.ts`). Free users see the
 * first item of a meal; the rest unlocks with an opt-in rewarded video for that meal or Premium.
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
  const { query, generate, premium, locked, watching, watchToUnlock } = useMealPlan(day, slot);
  const log = useLogFood();
  const plan = query.data?.plan ?? null;

  // Today's plan is created without a button, once; a failure offers a retry instead of looping.
  const autoTried = useRef(false);
  useEffect(() => {
    if (!isToday || autoTried.current || !query.isSuccess || plan) return;
    autoTried.current = true;
    generate.mutate(false);
  }, [isToday, query.isSuccess, plan, generate]);

  const errorCode =
    generate.error instanceof MealPlanError
      ? generate.error.code
      : generate.error
        ? 'failed'
        : null;
  const error = errorCode ? <FormMessage message={t(`mealPlan.error_${errorCode}`)} /> : null;

  if (query.isPending) return <SkeletonCard lines={2} />;

  if (!plan) {
    if (!isToday) return null;
    return (
      <View className="mb-4 gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          ✨ {generate.isError ? t('mealPlan.createTitle') : t('mealPlan.planning')}
        </Text>
        <Text className="text-[14px]">{t('mealPlan.planningDesc')}</Text>
        {error}
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

  const factor = isToday && state === 'current' ? adaptFactor(plan, logs, targetKcal) : 1;
  const items = (plan.slots[slot] ?? []).map((i) => adaptItem(i, factor));
  const visible = locked ? items.slice(0, 1) : items;
  const hidden = items.length - visible.length;
  const isLogged = (i: PlannedItem) =>
    logs.some((l) => l.source === 'plan' && l.food_ref === i.foodRef && l.meal_slot === slot);
  const next = MEAL_SLOTS[MEAL_SLOTS.indexOf(slot) + 1];
  const title = !isToday
    ? `✨ ${t('mealPlan.title')}`
    : state === 'done'
      ? t('mealPlan.doneTitle', { slot: t(`homeScreen.${slot}`) })
      : `✨ ${t('mealPlan.suggestionTitle', { slot: lower(slot) })}`;

  const logItem = (item: PlannedItem) =>
    log.mutate({
      slot,
      loggedAt: logTimeFor(day, slot, new Date()),
      name: item.name,
      foodRef: item.foodRef,
      quantity: item.grams,
      unit: 'g',
      macros: { kcal: item.kcal, proteinG: item.proteinG, carbsG: item.carbsG, fatG: item.fatG },
      source: 'plan',
    });

  return (
    <View className="mb-4 gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label" accessibilityRole="header" className="flex-1 font-bold">
          {title}
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
      {state === 'current' && isAdjusted(factor) ? (
        <Text variant="caption" tone="muted">
          {t('mealPlan.adjusted')}
        </Text>
      ) : null}
      {visible.map((item) => (
        <PlanItemRow
          key={`${item.foodRef}-${item.name}`}
          item={item}
          logged={isLogged(item)}
          busy={log.isPending}
          onLog={() => logItem(item)}
        />
      ))}
      {hidden > 0 ? (
        <HiddenPlanItems count={hidden} watching={watching} onWatch={watchToUnlock} />
      ) : null}
      {isToday && state === 'current' ? (
        <Text variant="caption" className="text-[13px]">
          {next ? t('mealPlan.nextHint', { next: lower(next) }) : t('mealPlan.lastHint')}{' '}
          {t('mealPlan.otherFood')}
        </Text>
      ) : null}
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
