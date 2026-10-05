import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET } from '@/theme';

import { SERVINGS_LIMITS, SERVINGS_STEP } from '../portion';

/** "How many of these did you have?" — multiplies the chosen amount (e.g. 2 × 100 g). */
export function ServingsStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [min, max] = SERVINGS_LIMITS;
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  const button = (delta: number, label: string, symbol: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => step(delta)}
      style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
      className={`items-center justify-center rounded-xl border border-border bg-card active:opacity-70 ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="font-bold text-xl">{symbol}</Text>
    </Pressable>
  );

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-2">
      <View className="flex-1">
        <Text variant="label" className="font-semibold">
          {t('logFood.servings')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('logFood.servingsHint')}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        {button(-SERVINGS_STEP, t('logFood.servingsLess'), '−', value <= min)}
        <Text
          accessibilityLabel={t('logFood.servingsValue', { count: formatNumber(value) })}
          className="min-w-8 text-center font-extrabold text-lg"
        >
          {formatNumber(value)}
        </Text>
        {button(SERVINGS_STEP, t('logFood.servingsMore'), '+', value >= max)}
      </View>
    </View>
  );
}
