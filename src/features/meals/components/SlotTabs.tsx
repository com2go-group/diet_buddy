import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';

import { MEAL_SLOTS, SLOT_EMOJI } from '../portion';
import type { MealSlot } from '../types';

/** Breakfast / Lunch / Snack / Dinner selector with a logged-item count. */
export function SlotTabs({
  value,
  onChange,
  counts,
}: {
  value: MealSlot;
  onChange: (slot: MealSlot) => void;
  counts?: Record<MealSlot, number>;
}) {
  return (
    <View accessibilityRole="tablist" className="mb-4 flex-row gap-2">
      {MEAL_SLOTS.map((slot) => {
        const selected = slot === value;
        const count = counts?.[slot] ?? 0;
        return (
          <Pressable
            key={slot}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={
              count ? `${t(`homeScreen.${slot}`)}, ${count}` : t(`homeScreen.${slot}`)
            }
            onPress={() => onChange(slot)}
            className={`min-h-[56px] flex-1 items-center justify-center rounded-2xl border-[1.5px] py-2 active:opacity-80 ${selected ? 'border-primary bg-accent' : 'border-border bg-card'}`}
          >
            <Text className="text-lg leading-6">{SLOT_EMOJI[slot]}</Text>
            <Text
              variant="caption"
              className={`mt-0.5 font-bold text-[11px] ${selected ? 'text-accent-foreground' : 'text-muted-foreground'}`}
            >
              {t(`homeScreen.${slot}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
