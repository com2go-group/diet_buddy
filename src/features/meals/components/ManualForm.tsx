import { useState } from 'react';
import { View } from 'react-native';

import { Button, NumberField, Text, TextField } from '@/components';
import { t, type StringKey } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import {
  EMPTY_MANUAL,
  validateManual,
  type ManualField,
  type ManualFood,
  type ManualValue,
} from '../manual';

function errorText(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (code.startsWith('range:')) {
    const [, min, max] = code.split(':');
    return t('logFood.amountInvalid', { min: min!, max: max! });
  }
  return t(code as StringKey);
}

/** Manual entry for foods not in the database (numbers from the pack label). */
export function ManualForm({
  slotLabel,
  saving,
  failed,
  onAdd,
}: {
  slotLabel: string;
  saving: boolean;
  failed: boolean;
  onAdd: (value: ManualValue) => void;
}) {
  const [form, setForm] = useState<ManualFood>(EMPTY_MANUAL);
  const [errors, setErrors] = useState<Partial<Record<ManualField, string>>>({});
  const set = (patch: Partial<ManualFood>) => {
    setForm({ ...form, ...patch });
    setErrors({});
  };
  const number = (field: 'calories' | 'proteinG' | 'carbsG' | 'fatG', label: StringKey) => (
    <NumberField
      label={t(label)}
      value={form[field]}
      onChangeValue={(v) => set({ [field]: v })}
      error={errorText(errors[field])}
      className="flex-1"
    />
  );

  return (
    <View className="gap-4">
      <Text variant="caption" tone="muted" className="text-[13px]">
        {t('logFood.manualHint')}
      </Text>
      <TextField
        label={t('logFood.name')}
        value={form.name}
        onChangeText={(name) => set({ name })}
        maxLength={200}
        error={errorText(errors.name)}
        autoCapitalize="sentences"
      />
      <View className="flex-row gap-3">
        <NumberField
          label={t('logFood.quantity')}
          value={form.quantity}
          onChangeValue={(quantity) => set({ quantity })}
          decimals={2}
          error={errorText(errors.quantity)}
          className="flex-1"
        />
        <TextField
          label={t('logFood.quantityUnit')}
          placeholder={t('logFood.quantityUnitPlaceholder')}
          value={form.unit}
          onChangeText={(unit) => set({ unit })}
          maxLength={32}
          className="flex-1"
        />
      </View>
      {number('calories', 'logFood.calories')}
      <View className="flex-row gap-3">
        {number('proteinG', 'logFood.protein')}
        {number('carbsG', 'logFood.carbs')}
        {number('fatG', 'logFood.fat')}
      </View>
      <FormMessage message={failed ? t('logFood.saveFailed') : undefined} />
      <Button
        label={t('logFood.add', { slot: slotLabel })}
        loading={saving}
        onPress={() => {
          const result = validateManual(form);
          if (result.ok) onAdd(result.value);
          else setErrors(result.errors);
        }}
      />
    </View>
  );
}
