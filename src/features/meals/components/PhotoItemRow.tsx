import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { NumberField, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { PHOTO_GRAMS, photoItemMacros } from '../photo';
import { photoWarningText } from '../photoWarnings';
import type { PhotoItem } from '../types';

export interface PhotoChoice {
  included: boolean;
  grams: number | null;
}

/** One recognised food: include toggle, editable grams, USDA numbers and any warnings. */
export function PhotoItemRow({
  item,
  choice,
  onChange,
}: {
  item: PhotoItem;
  choice: PhotoChoice;
  onChange: (c: PhotoChoice) => void;
}) {
  const { colors } = useTheme();
  const matched = item.food !== null;
  const gramsValid =
    choice.grams !== null && choice.grams >= PHOTO_GRAMS[0] && choice.grams <= PHOTO_GRAMS[1];
  const macros = gramsValid ? photoItemMacros(item, choice.grams!) : null;
  const checked = matched && choice.included;

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-start gap-3">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={t('foodPhoto.include', { name: item.name })}
          aria-checked={checked}
          aria-disabled={!matched}
          disabled={!matched}
          onPress={() => onChange({ ...choice, included: !choice.included })}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="-m-2 items-center justify-center"
        >
          <View
            className={
              checked
                ? 'h-6 w-6 items-center justify-center rounded-md bg-primary-text'
                : 'h-6 w-6 rounded-md border-2 border-border bg-muted'
            }
          >
            {checked ? <Feather name="check" size={14} color={colors.background} /> : null}
          </View>
        </Pressable>
        <View className="flex-1 gap-0.5">
          <Text className="font-semibold text-[15px] leading-5">{item.name}</Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {item.food
              ? t('foodPhoto.matched', { source: item.food.name })
              : t('foodPhoto.noMatch')}
          </Text>
        </View>
      </View>
      {matched ? (
        <View className="flex-row items-end gap-3">
          <View className="w-28">
            <NumberField
              label={t('logFood.grams')}
              accessibilityLabel={t('foodPhoto.grams', { name: item.name })}
              value={choice.grams}
              onChangeValue={(grams) => onChange({ ...choice, grams })}
              decimals={0}
              unit="g"
              error={
                choice.grams !== null && !gramsValid
                  ? t('logFood.amountInvalid', {
                      min: PHOTO_GRAMS[0],
                      max: formatNumber(PHOTO_GRAMS[1]),
                    })
                  : undefined
              }
            />
          </View>
          <View className="flex-1 pb-2" accessible>
            <Text className="font-bold text-[15px]">
              {macros ? `${formatNumber(macros.kcal)} kcal` : '—'}
            </Text>
            {macros ? (
              <Text tone="muted" className="text-[13px]">
                {t('meals.macroShort', {
                  p: formatDecimal(macros.proteinG),
                  c: formatDecimal(macros.carbsG),
                  f: formatDecimal(macros.fatG),
                })}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {item.confidence === 'low' && matched ? (
        <View className="flex-row items-center gap-1.5">
          <Feather name="help-circle" size={13} color={colors.mutedForeground} />
          <Text variant="caption" tone="muted">
            {t('foodPhoto.lowConfidence')}
          </Text>
        </View>
      ) : null}
      {item.warnings.map((w) => (
        <View key={w} className="flex-row items-center gap-1.5" accessibilityRole="alert">
          <Feather name="alert-triangle" size={13} color={colors.destructive} />
          <Text variant="caption" tone="destructive" className="flex-1">
            {photoWarningText(w)}
          </Text>
        </View>
      ))}
    </View>
  );
}
