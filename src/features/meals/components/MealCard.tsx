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
  children,
}: {
  dish: Dish;
  items: PlannedItem[];
  locked: boolean;
  watching: boolean;
  onWatch: () => void;
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
        {visible.map((item) => (
          <PlanItemRow key={`${item.foodRef}-${item.name}`} item={item} />
        ))}
      </View>
      {hidden > 0 ? <HiddenPlanItems count={hidden} watching={watching} onWatch={onWatch} /> : null}
      {/* The recipe names every ingredient, so it's revealed with them. */}
      {!locked && dish.steps?.length ? <RecipeSteps steps={dish.steps} /> : null}
      {children}
    </View>
  );
}
