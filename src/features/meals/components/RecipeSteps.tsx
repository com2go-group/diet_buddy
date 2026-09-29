import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

/** "How to make it": the dish's recipe steps, folded away until asked for. */
export function RecipeSteps({ steps }: { steps: string[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('mealPlan.howTo', { count: steps.length })}
        aria-expanded={open}
        onPress={() => setOpen((o) => !o)}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className="flex-row items-center justify-between active:opacity-70"
      >
        <Text variant="label" tone="primary" className="font-bold">
          {t('mealPlan.howTo', { count: steps.length })}
        </Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open ? (
        <View className="gap-1.5">
          {steps.map((step, i) => (
            <View key={i} className="flex-row gap-2">
              <Text variant="caption" tone="muted" className="w-5 font-bold">
                {i + 1}.
              </Text>
              <Text className="flex-1 text-[14px] leading-5">{step}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
