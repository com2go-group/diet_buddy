import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { accentColor, useTheme } from '@/theme';

import type { Dish, PlannedItem } from '../mealPlanApi';
import { mealTotals } from '../sequence';
import { HiddenPlanItems } from './HiddenPlanItems';
import { PlanItemRow } from './PlanItemRow';
import { RecipeSteps } from './RecipeSteps';

/**
 * A planned meal as a dish: its name, how to put it together, its ingredients and totals (USDA
 * numbers). Free users see the first ingredient; the rest unlocks with the meal's video.
 */
export function MealCard({
  dish,
  items,
  locked,
  watching,
  onWatch,
  onSwap,
  swapping = null,
  children,
}: {
  dish: Dish;
  items: PlannedItem[];
  locked: boolean;
  watching: boolean;
  onWatch: () => void;
  /** Swap an ingredient (by position); only for the meal that's up next. */
  onSwap?: (index: number) => void;
  /** The ingredient being swapped right now. */
  swapping?: number | null;
  children?: React.ReactNode;
}) {
  const { scheme } = useTheme();
  const visible = locked ? items.slice(0, 1) : items;
  const hidden = items.length - visible.length;
  const total = mealTotals(items);
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4">
      <Text variant="heading" className="text-[17px]">
        {dish.title}
      </Text>
      {dish.description ? (
        <Text tone="muted" className="text-[14px]">
          {dish.description}
        </Text>
      ) : null}
      {dish.leftover ? (
        <Text variant="caption" className="font-semibold">
          🥡 {t('mealPlan.leftover')}
        </Text>
      ) : null}
      {dish.prepMinutes ? (
        <Text variant="caption" tone="muted">
          ⏱ {t('mealPlan.prepTime', { minutes: dish.prepMinutes })}
        </Text>
      ) : null}
      <Text variant="caption" className="font-semibold">
        {t('mealPlan.mealTotal', { kcal: formatNumber(total.kcal) })} ·{' '}
        <Text variant="caption" style={{ color: accentColor('green', scheme) }}>
          P {formatNumber(total.proteinG)}g
        </Text>{' '}
        · C {formatNumber(total.carbsG)}g · F {formatNumber(total.fatG)}g
      </Text>
      <View>
        {visible.map((item, index) => (
          <PlanItemRow
            key={`${item.foodRef}-${item.name}`}
            item={item}
            onSwap={onSwap && swapping === null ? () => onSwap(index) : undefined}
            swapping={swapping === index}
          />
        ))}
      </View>
      {dish.swapped?.length ? (
        <Text variant="caption" tone="muted">
          🔁{' '}
          {dish.swapped.map((s) => t('mealPlan.swapped', { from: s.from, to: s.to })).join(' · ')}
        </Text>
      ) : null}
      {hidden > 0 ? <HiddenPlanItems count={hidden} watching={watching} onWatch={onWatch} /> : null}
      {/* The recipe names every ingredient, so it's revealed with them. */}
      {!locked && dish.steps?.length ? <RecipeSteps steps={dish.steps} /> : null}
      {children}
    </View>
  );
}
