import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { Button, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import { useSessionStore } from '../../auth/sessionStore';
import { useJourneyStore } from '../../home/journeyStore';
import { usePremium } from '../../subscriptions/usePremium';
import { MealPlanError, type MealPlan } from '../mealPlanApi';
import { MEAL_SLOTS, slotTarget } from '../portion';
import { adaptFactor, slotOutcome, slotStates } from '../sequence';
import type { FoodLog, MealSlot } from '../types';
import { useGenerateMealPlan, useMealPlanDay } from '../useMealPlan';
import { MealSlotCard, type MealCardState } from './MealSlotCard';

const errorText = (e: unknown) =>
  e ? t(`mealPlan.error_${e instanceof MealPlanError ? e.code : 'failed'}`) : undefined;

/** Each meal's place on today's timeline (sequence.ts), or `open` without a plan. */
export function cardStates(
  plan: MealPlan | null,
  logs: FoodLog[],
  isToday: boolean,
): Record<MealSlot, MealCardState> {
  const states = isToday && plan ? slotStates(plan, logs) : null;
  return Object.fromEntries(
    MEAL_SLOTS.map((slot) => {
      if (!states || !plan) return [slot, 'open'];
      if (states[slot] === 'current') return [slot, 'next'];
      if (states[slot] === 'locked') return [slot, 'later'];
      return [slot, slotOutcome(plan, logs, slot) === 'skipped' ? 'skipped' : 'done'];
    }),
  ) as Record<MealSlot, MealCardState>;
}

/**
 * The day's meals as one timeline (CLAUDE.md §7.6): each meal is a card that shows either the AI
 * plan's dish (up next, or later, folded) or what was eaten for it, so the plan and the log are
 * never in two places. Today's plan is created automatically, once; a failure offers a retry and
 * logging still works meanwhile.
 */
export function MealTimeline({
  day,
  isToday,
  logs,
  targetKcal,
  onAdd,
  onDelete,
}: {
  day: Date;
  isToday: boolean;
  logs: FoodLog[];
  targetKcal: number | null;
  onAdd: (slot: MealSlot) => void;
  onDelete: (id: string) => void;
}) {
  const userId = useSessionStore((s) => s.session?.user.id) ?? '';
  const hintDismissed = useJourneyStore((s) => Boolean(s.mealsHintDismissed[userId]));
  const dismissHint = useJourneyStore((s) => s.dismissMealsHint);
  const { premium } = usePremium();
  const query = useMealPlanDay(day);
  const generate = useGenerateMealPlan(day);
  const plan = query.data?.plan ?? null;

  const autoTried = useRef(false);
  useEffect(() => {
    if (!isToday || autoTried.current || !query.isSuccess || plan) return;
    autoTried.current = true;
    generate.mutate(false);
  }, [isToday, query.isSuccess, plan, generate]);

  const states = cardStates(plan, logs, isToday);
  const factor = isToday && plan ? adaptFactor(plan, logs, targetKcal) : 1;
  const allDone =
    isToday && plan && MEAL_SLOTS.every((s) => ['done', 'skipped'].includes(states[s]));

  return (
    <View>
      {isToday && query.isPending ? <SkeletonCard lines={2} /> : null}
      {isToday && query.isSuccess && !plan ? (
        <View className="mb-3 gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <Text variant="heading" accessibilityRole="header" className="text-base">
            ✨ {generate.isError ? t('mealPlan.createTitle') : t('mealPlan.planning')}
          </Text>
          <Text className="text-[14px]">{t('mealPlan.planningDesc')}</Text>
          <FormMessage message={errorText(generate.error)} />
          {generate.isError ? (
            <Button label={t('mealPlan.retry')} onPress={() => generate.mutate(false)} />
          ) : null}
        </View>
      ) : null}

      {isToday && plan ? (
        <View className="mb-2 flex-row items-center justify-between">
          <Text variant="label" accessibilityRole="header" className="flex-1 font-bold">
            ✨ {t('mealPlan.dayTitle')}
          </Text>
          {premium && !allDone ? (
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
      ) : null}
      {isToday && plan ? <FormMessage message={errorText(generate.error)} /> : null}
      {isToday && plan && !hintDismissed ? (
        <View className="mb-3 flex-row items-start gap-2 rounded-2xl border border-primary/20 bg-primary/10 py-2 pl-4 pr-1">
          <Text className="flex-1 py-1 text-[14px]">💡 {t('mealPlan.howItWorks')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mealPlan.hideHint')}
            onPress={() => dismissHint(userId)}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
            className="items-center justify-center active:opacity-60"
          >
            <Text tone="muted">✕</Text>
          </Pressable>
        </View>
      ) : null}

      {MEAL_SLOTS.map((slot) => (
        <MealSlotCard
          key={slot}
          day={day}
          slot={slot}
          state={states[slot]}
          plan={plan}
          logs={logs.filter((l) => l.meal_slot === slot)}
          target={targetKcal ? slotTarget(targetKcal, slot) : null}
          factor={factor}
          onAdd={() => onAdd(slot)}
          onDelete={onDelete}
        />
      ))}

      {allDone ? (
        <Text variant="label" tone="success" className="mb-2 font-bold">
          {t('mealPlan.allDone')}
        </Text>
      ) : null}
      {isToday && plan ? (
        <Text variant="caption" tone="muted" className="mb-3">
          {t('mealPlan.totals', {
            kcal: formatNumber(plan.totals.kcal),
            protein: formatNumber(plan.totals.proteinG),
          })}{' '}
          · {t('mealPlan.note')}
        </Text>
      ) : null}
    </View>
  );
}
