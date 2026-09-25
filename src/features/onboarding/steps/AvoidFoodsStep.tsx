import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { toggleOption } from '../draft';
import { FOOD_CATEGORIES } from '../foodOptions';
import { StepHeader, type StepProps } from './shared';

const foodLabel = (id: string) => t(`onboardingFoods.${id}` as `onboardingFoods.salmon`);

export function AvoidFoodsStep({ draft, update }: StepProps) {
  const [open, setOpen] = useState<string | null>(null);
  const { colors } = useTheme();
  const toggle = (id: string) => {
    haptics.selection();
    update({ avoidFoods: toggleOption(draft.avoidFoods, id) });
  };

  return (
    <>
      <StepHeader emoji="🙅" title={t('avoidFoods.title')} subtitle={t('avoidFoods.subtitle')} />
      {draft.avoidFoods.length > 0 ? (
        <View className="mb-4 flex-row flex-wrap gap-1.5">
          {draft.avoidFoods.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={t('avoidFoods.remove', { food: foodLabel(id) })}
              onPress={() => toggle(id)}
              style={{ minHeight: MIN_TOUCH_TARGET }}
              className="flex-row items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-3"
            >
              <Text variant="caption" tone="destructive" className="font-semibold">
                {foodLabel(id)}
              </Text>
              <Feather name="x" size={12} color={colors.destructive} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View className="gap-2">
        {FOOD_CATEGORIES.map((category) => {
          const isOpen = open === category.id;
          const selected = category.items.filter((i) => draft.avoidFoods.includes(i)).length;
          const title = t(`onboardingFoodCategories.${category.id}`);
          return (
            <View
              key={category.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <Pressable
                accessibilityRole="button"
                aria-expanded={isOpen}
                accessibilityLabel={
                  selected
                    ? `${title}, ${t('avoidFoods.avoidedCount', { count: selected })}`
                    : title
                }
                onPress={() => setOpen(isOpen ? null : category.id)}
                style={{ minHeight: MIN_TOUCH_TARGET + 4 }}
                className="flex-row items-center justify-between px-4 active:opacity-80"
              >
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-xl leading-7">{category.emoji}</Text>
                  <Text variant="label" className="font-bold">
                    {title}
                  </Text>
                  {selected > 0 ? (
                    <View className="rounded-full bg-destructive/10 px-2 py-0.5">
                      <Text variant="caption" tone="destructive" className="font-extrabold">
                        {t('avoidFoods.avoidedCount', { count: selected })}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Feather
                  name={isOpen ? 'chevron-down' : 'chevron-right'}
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
              {isOpen ? (
                <View className="flex-row flex-wrap gap-2 border-t border-border px-4 pb-3 pt-2">
                  {category.items.map((item) => {
                    const avoided = draft.avoidFoods.includes(item);
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="checkbox"
                        aria-checked={avoided}
                        accessibilityLabel={foodLabel(item)}
                        onPress={() => toggle(item)}
                        style={{ minHeight: MIN_TOUCH_TARGET }}
                        className={
                          avoided
                            ? 'justify-center rounded-full border-[1.5px] border-destructive bg-destructive/10 px-3'
                            : 'justify-center rounded-full border-[1.5px] border-transparent bg-muted px-3'
                        }
                      >
                        <Text
                          variant="caption"
                          tone={avoided ? 'destructive' : 'default'}
                          className="font-semibold text-[13px]"
                        >
                          {avoided ? '✕ ' : ''}
                          {foodLabel(item)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </>
  );
}
