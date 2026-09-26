import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, ProgressBar, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { photoWarningText } from '../../meals/photoWarnings';
import type { Dish } from '../api';

/** One dish: fit score, estimate, warnings, typical ingredients and a log button. */
export function DishCard({
  dish,
  best,
  mealLabel,
  logging,
  logged,
  onLog,
}: {
  dish: Dish;
  best: boolean;
  mealLabel: string;
  logging: boolean;
  logged: boolean;
  onLog: () => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const e = dish.estimate;
  return (
    <View
      className={`gap-2.5 rounded-2xl border bg-card p-4 ${best ? 'border-primary' : 'border-border'}`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text variant="label" className="flex-1 font-bold text-[16px] leading-6">
          {dish.name}
        </Text>
        {best ? (
          <View className="rounded-full bg-accent px-2.5 py-1">
            <Text variant="caption" className="font-bold text-accent-foreground">
              ⭐ {t('restaurant.bestMatch')}
            </Text>
          </View>
        ) : null}
      </View>
      {e ? (
        <>
          <Text className="font-semibold">
            {t('restaurant.estimate', {
              kcal: formatNumber(e.kcal),
              protein: formatDecimal(e.proteinG),
            })}
          </Text>
          {!dish.warnings.length ? (
            <ProgressBar
              value={dish.score / 100}
              label={t('restaurant.fit', { score: dish.score })}
            />
          ) : null}
        </>
      ) : (
        <Text tone="muted" className="text-[13px]">
          {t('restaurant.noEstimate')}
        </Text>
      )}
      {dish.warnings.map((w) => (
        <View key={w} className="flex-row items-center gap-1.5" accessibilityRole="alert">
          <Feather name="alert-triangle" size={13} color={colors.destructive} />
          <Text variant="caption" tone="destructive" className="flex-1">
            {photoWarningText(w)}
          </Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(open ? 'restaurant.hideIngredients' : 'restaurant.showIngredients', {
          dish: dish.name,
        })}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className="flex-row items-center gap-1"
      >
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.mutedForeground}
        />
        <Text variant="caption" tone="muted" className="font-semibold">
          {t('restaurant.ingredients', { count: dish.ingredients.length })}
        </Text>
      </Pressable>
      {open ? (
        <View className="gap-0.5">
          {dish.ingredients.map((i) => (
            <Text key={`${i.name}-${i.grams}`} variant="caption" tone="muted">
              {t('restaurant.ingredient', { name: i.name, grams: i.grams })}
            </Text>
          ))}
        </View>
      ) : null}
      {e ? (
        <Button
          label={
            logged
              ? t('restaurant.logged', { meal: mealLabel })
              : t('restaurant.log', { meal: mealLabel })
          }
          variant={best && !logged ? 'primary' : 'outline'}
          disabled={logged}
          loading={logging}
          onPress={onLog}
        />
      ) : null}
    </View>
  );
}
