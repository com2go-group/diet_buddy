import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';

import type { MealSlot } from '../types';

const name = (slot: MealSlot) => t(`homeScreen.${slot}`).toLowerCase();

/** A later meal of today's plan: shown once the current one is logged from the plan. */
export function LockedMealCard({
  slot,
  current,
  onGoToCurrent,
}: {
  slot: MealSlot;
  current: MealSlot;
  onGoToCurrent: () => void;
}) {
  return (
    <View className="mb-4 gap-2 rounded-2xl border border-dashed border-border bg-card p-4">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        🔒 {t('mealPlan.lockedTitle', { slot: name(slot) })}
      </Text>
      <Text tone="muted" className="text-[14px]">
        {t('mealPlan.lockedDesc', { current: name(current), slot: name(slot) })}
      </Text>
      <Button
        label={t('mealPlan.goTo', { slot: name(current) })}
        variant="outline"
        size="md"
        onPress={onGoToCurrent}
      />
    </View>
  );
}
