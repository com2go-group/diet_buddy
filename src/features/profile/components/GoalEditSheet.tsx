import { useState } from 'react';
import { View } from 'react-native';

import { Button, NumberField, Sheet, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';

import { FormMessage } from '../../auth/components/FormMessage';
import { WATER_LIMITS_ML, withCalories, withWater, type CurrentPlan } from '../goals';

export type GoalEdit = 'calories' | 'water';

/** Edits the calorie target (never below the safety floor) or the water goal. */
export function GoalEditSheet({
  edit,
  plan,
  floor,
  max,
  tdee,
  saving,
  failed,
  onSave,
  onClose,
}: {
  edit: GoalEdit | null;
  plan: CurrentPlan;
  floor: number;
  max: number;
  tdee: number | null;
  saving: boolean;
  failed: boolean;
  onSave: (next: CurrentPlan) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  const isCalories = edit === 'calories';
  const current = isCalories ? plan.daily_calories : plan.water_ml / 1000;
  const shown = value ?? current;
  const [min, top] = isCalories
    ? [floor, max]
    : [WATER_LIMITS_ML[0] / 1000, WATER_LIMITS_ML[1] / 1000];
  const valid = shown >= min && shown <= top;
  const next = !valid
    ? null
    : isCalories
      ? withCalories(plan, shown, floor, tdee)
      : withWater(plan, shown * 1000);

  return (
    <Sheet
      visible={edit !== null}
      onClose={() => {
        setValue(null);
        onClose();
      }}
      title={isCalories ? t('profile.calorieTarget') : t('profile.hydrationGoal')}
    >
      <View className="gap-4 pb-2">
        <NumberField
          label={isCalories ? t('profile.editCalories') : t('profile.editWater')}
          value={shown}
          decimals={isCalories ? 0 : 1}
          unit={isCalories ? 'kcal' : 'L'}
          onChangeValue={(v) => setValue(v ?? 0)}
          hint={
            isCalories
              ? t('profile.editCaloriesHint', { min: formatNumber(min), max: formatNumber(top) })
              : t('profile.editWaterHint', { min: formatDecimal(min), max: formatDecimal(top) })
          }
          error={
            valid
              ? undefined
              : t('profile.outOfRange', { min: formatDecimal(min), max: formatDecimal(top) })
          }
        />
        {isCalories && next ? (
          <Text tone="muted" className="text-[13px]">
            {t('profile.macrosAfter', {
              protein: next.protein_g,
              carbs: next.carbs_g,
              fat: next.fat_g,
            })}
          </Text>
        ) : null}
        <FormMessage message={failed ? t('profile.saveFailed') : undefined} />
        <Button
          label={t('profile.save')}
          disabled={!next}
          loading={saving}
          onPress={() => next && onSave(next)}
        />
      </View>
    </Sheet>
  );
}
