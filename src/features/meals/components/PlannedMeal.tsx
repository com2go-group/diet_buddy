import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Callout, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import { AiBoostButton } from '../../ads';
import { openPaywall } from '../../subscriptions/paywallRoute';
import { dishOf, MealPlanError, type MealPlan } from '../mealPlanApi';
import { logTimeFor } from '../portion';
import { adaptItem, isAdjusted, mealTotals } from '../sequence';
import type { MealSlot } from '../types';
import { useLogFood } from '../useMeals';
import { useMealPlan } from '../useMealPlan';
import { MealActions } from './MealActions';
import { MealCard } from './MealCard';

const errorText = (e: unknown) =>
  e ? t(`mealPlan.error_${e instanceof MealPlanError ? e.code : 'failed'}`) : undefined;

/**
 * The meal that's up next: the dish with portions adapted to what was eaten today (`factor`),
 * "I ate this" and the folded "Change" menu. Free users see the first ingredient; the rest
 * unlocks with the meal's opt-in video or Premium.
 */
export function CurrentMeal({
  day,
  slot,
  plan,
  factor,
  onOwn,
}: {
  day: Date;
  slot: MealSlot;
  plan: MealPlan;
  factor: number;
  onOwn: () => void;
}) {
  const { date, act, swap, premium, locked, watching, watchToUnlock } = useMealPlan(day, slot);
  const log = useLogFood();
  const dish = dishOf(plan, slot);
  const planned = plan.slots[slot] ?? [];
  const items = planned.map((i) => adaptItem(i, factor));
  const from = mealTotals(planned).kcal;
  const to = mealTotals(items).kcal;

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

  return (
    <View className="gap-2">
      {isAdjusted(factor) && from !== to ? (
        <Callout emoji="⚖️" tone="info" live>
          {t('mealPlan.adjustedFrom', { from: formatNumber(from), to: formatNumber(to) })}
        </Callout>
      ) : null}
      <FormMessage
        message={errorText(act.error) ?? errorText(swap.error) ?? errorText(log.error)}
      />
      {!premium && swap.error instanceof MealPlanError && swap.error.code === 'swap_limit' ? (
        <Button
          label={t('mealPlan.moreSwapsPremium')}
          size="md"
          onPress={() => openPaywall('mealPlans')}
        />
      ) : null}
      {!premium &&
      act.error instanceof MealPlanError &&
      (act.error.code === 'alternative_limit' || act.error.code === 'ai_budget') ? (
        <>
          {/* A rewarded video adds more ideas today (not on the web). */}
          <AiBoostButton boost={act.error.boost} onEarned={() => act.reset()} />
          <Button
            label={t('mealPlan.moreIdeasPremium')}
            size="md"
            onPress={() => openPaywall('mealPlans')}
          />
        </>
      ) : null}
      <MealCard
        dish={dish}
        items={items}
        locked={locked}
        watching={watching}
        onWatch={watchToUnlock}
        // Leftovers are already cooked; the rest can swap once the meal is revealed.
        onSwap={locked || dish.leftover ? undefined : (i) => swap.mutate(i)}
        swapping={swap.isPending ? (swap.variables ?? null) : null}
      >
        <MealActions
          day={day}
          slot={slot}
          title={dish.title}
          logging={log.isPending}
          asking={act.isPending && act.variables === 'alternative'}
          skipping={act.isPending && act.variables === 'skip'}
          onAte={logMeal}
          onAnother={() => act.mutate('alternative')}
          onOwn={onOwn}
          onSkip={() => act.mutate('skip')}
        />
      </MealCard>
    </View>
  );
}

/**
 * A later meal: its dish and planned calories, folded. It can always be read (nothing is locked
 * by the order of meals); its portions are set once it's up next.
 */
export function UpcomingMeal({ day, slot, plan }: { day: Date; slot: MealSlot; plan: MealPlan }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { locked, watching, watchToUnlock } = useMealPlan(day, slot);
  const dish = dishOf(plan, slot);
  const items = plan.slots[slot] ?? [];
  const slotName = t(`homeScreen.${slot}`);
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          open
            ? t('mealPlan.hideLater', { slot: slotName })
            : t('mealPlan.showLater', { slot: slotName })
        }
        aria-expanded={open}
        onPress={() => setOpen((o) => !o)}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className="flex-row items-center gap-2 active:opacity-70"
      >
        <View className="flex-1">
          <Text className="font-semibold text-[15px]" numberOfLines={2}>
            {dish.title}
          </Text>
          <Text variant="caption" tone="muted">
            ~{t('mealPlan.mealTotal', { kcal: formatNumber(mealTotals(items).kcal) })} ·{' '}
            {t('mealPlan.laterNote')}
          </Text>
        </View>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open ? (
        <MealCard
          dish={dish}
          items={items}
          locked={locked}
          watching={watching}
          onWatch={watchToUnlock}
        />
      ) : null}
    </View>
  );
}

/** A skipped meal, with undo. */
export function SkippedMeal({ day, slot }: { day: Date; slot: MealSlot }) {
  const { act } = useMealPlan(day, slot);
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text tone="muted" className="flex-1 text-[14px]">
          {t('mealPlan.outcome_skipped')}
        </Text>
        <Button
          label={t('mealPlan.undoSkip')}
          variant="ghost"
          size="md"
          fullWidth={false}
          loading={act.isPending}
          onPress={() => act.mutate('unskip')}
        />
      </View>
      <FormMessage message={errorText(act.error)} />
    </View>
  );
}
