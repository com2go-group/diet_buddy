import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, NumberField, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { accentColor, useTheme } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import { AMOUNT_LIMITS, macrosFor } from '../portion';
import type { Macros, PortionFood } from '../types';

export type PortionUnit = 'g' | number | 'portion';

/** Amount + unit picker with live macros for the chosen food. */
export function PortionPanel({
  food,
  slotLabel,
  saving,
  failed,
  onAdd,
}: {
  food: PortionFood;
  slotLabel: string;
  saving: boolean;
  failed: boolean;
  onAdd: (amount: number, unit: PortionUnit, macros: Macros) => void;
}) {
  const { scheme } = useTheme();
  const initialUnit: PortionUnit =
    food.kind === 'portion' ? 'portion' : food.servings.length ? 0 : 'g';
  const [unit, setUnit] = useState<PortionUnit>(initialUnit);
  const [amount, setAmount] = useState<number | null>(initialUnit === 'g' ? 100 : 1);
  const limits =
    unit === 'g'
      ? AMOUNT_LIMITS.g
      : unit === 'portion'
        ? AMOUNT_LIMITS.portion
        : AMOUNT_LIMITS.serving;
  const valid = amount !== null && amount >= limits[0] && amount <= limits[1];
  const macros = valid ? macrosFor(food, amount, unit) : null;

  const units: { value: PortionUnit; label: string }[] =
    food.kind === 'portion'
      ? [{ value: 'portion', label: t('logFood.portionOf', { label: food.portionLabel }) }]
      : [
          ...food.servings.map((s, i) => ({ value: i as PortionUnit, label: s.label })),
          { value: 'g' as const, label: t('logFood.grams') },
        ];

  const stats: [string, string, 'amber' | 'green' | 'blue' | 'violet'][] = macros
    ? [
        [t('macros.calories'), `${formatNumber(macros.kcal)}`, 'amber'],
        [t('macros.protein'), `${formatDecimal(macros.proteinG)}g`, 'green'],
        [t('macros.carbs'), `${formatDecimal(macros.carbsG)}g`, 'blue'],
        [t('macros.fat'), `${formatDecimal(macros.fatG)}g`, 'violet'],
      ]
    : [];

  return (
    <View className="gap-4">
      <View>
        <Text variant="heading" accessibilityRole="header">
          {food.name}
        </Text>
        {food.brand ? (
          <Text variant="caption" tone="muted">
            {food.brand}
          </Text>
        ) : null}
      </View>
      <NumberField
        label={t('logFood.amount')}
        value={amount}
        onChangeValue={setAmount}
        decimals={2}
        unit={unit === 'g' ? 'g' : '×'}
        error={
          amount !== null && !valid
            ? t('logFood.amountInvalid', { min: limits[0], max: formatNumber(limits[1]) })
            : undefined
        }
      />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('logFood.unit')}
        className="flex-row flex-wrap gap-2"
      >
        {units.map((u) => (
          <Chip
            key={String(u.value)}
            label={u.label}
            selected={unit === u.value}
            selectionRole="radio"
            onPress={() => {
              if (u.value === unit) return;
              setUnit(u.value);
              setAmount(u.value === 'g' ? 100 : 1);
            }}
          />
        ))}
      </View>
      <View className="flex-row justify-between rounded-2xl border border-border bg-card p-4">
        {stats.map(([label, value, accent]) => (
          <View key={label} accessible className="items-center">
            <Text className="font-extrabold text-lg" style={{ color: accentColor(accent, scheme) }}>
              {value}
            </Text>
            <Text variant="caption" tone="muted">
              {label}
            </Text>
          </View>
        ))}
        {!stats.length ? <Text tone="muted">—</Text> : null}
      </View>
      {food.kind === 'per100g' && food.ref?.startsWith('usda:') ? (
        <Text variant="caption" tone="muted">
          {t('logFood.source')}
        </Text>
      ) : null}
      <FormMessage message={failed ? t('logFood.saveFailed') : undefined} />
      <Button
        label={t('logFood.add', { slot: slotLabel })}
        disabled={!macros}
        loading={saving}
        onPress={() => macros && amount !== null && onAdd(amount, unit, macros)}
      />
    </View>
  );
}
