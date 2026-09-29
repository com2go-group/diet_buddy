import { View } from 'react-native';

import { Card, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import type { MealPlan } from '../mealPlanApi';
import { SLOT_EMOJI, totals } from '../portion';
import type { FoodLog, MealSlot } from '../types';
import { CurrentMeal, SkippedMeal, UpcomingMeal } from './PlannedMeal';
import { SlotLogs } from './SlotLogs';

/**
 * Where a meal stands on the day's timeline: `next` (the plan's current meal), `later` (a plan
 * meal still to come), `done` (logged, from the plan or not), `skipped`, or `open` (no plan: a
 * past day, or while today's plan is being made).
 */
export type MealCardState = 'next' | 'later' | 'done' | 'skipped' | 'open';

const BADGES = {
  next: { key: 'mealPlan.badgeNext', className: 'bg-primary/15' },
  later: { key: 'mealPlan.badgeLater', className: 'bg-muted' },
  done: { key: 'mealPlan.badgeDone', className: 'bg-success/15' },
  skipped: { key: 'mealPlan.badgeSkipped', className: 'bg-muted' },
} as const;

/** One meal of the day: its header, and the plan or the logged food for it, in one card. */
export function MealSlotCard({
  day,
  slot,
  state,
  plan,
  logs,
  target,
  factor,
  onAdd,
  onDelete,
}: {
  day: Date;
  slot: MealSlot;
  state: MealCardState;
  plan: MealPlan | null;
  /** This meal's logs. */
  logs: FoodLog[];
  target: number | null;
  /** Portion factor for the meal that's up next (sequence.ts). */
  factor: number;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const kcal = totals(logs).kcal;
  const badge = state === 'open' ? null : BADGES[state];
  const name = t(`homeScreen.${slot}`);
  return (
    <Card
      className={`mb-3 gap-3 ${state === 'next' ? 'border-2 border-primary/40' : ''}`}
      testID={`meal-${slot}`}
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-lg">{SLOT_EMOJI[slot]}</Text>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="heading" accessibilityRole="header" className="text-base">
              {name}
            </Text>
            {badge ? (
              <View className={`rounded-full px-2 py-0.5 ${badge.className}`}>
                <Text variant="caption" className="font-semibold text-[12px]">
                  {t(badge.key)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption" tone="muted" className="text-[13px]">
            {target === null
              ? `${formatNumber(kcal)} kcal`
              : t('meals.slotSummary', {
                  current: formatNumber(kcal),
                  target: formatNumber(target),
                })}
          </Text>
        </View>
      </View>
      {state === 'next' && plan ? (
        <CurrentMeal day={day} slot={slot} plan={plan} factor={factor} onOwn={onAdd} />
      ) : state === 'later' && plan ? (
        <UpcomingMeal day={day} slot={slot} plan={plan} />
      ) : state === 'skipped' ? (
        <SkippedMeal day={day} slot={slot} />
      ) : (
        <SlotLogs
          day={day}
          slot={slot}
          logs={logs}
          target={target}
          onAdd={onAdd}
          onDelete={onDelete}
        />
      )}
    </Card>
  );
}
