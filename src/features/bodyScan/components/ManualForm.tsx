import { useState } from 'react';
import { View } from 'react-native';

import { Button, NumberField, Text } from '@/components';
import { t } from '@/i18n';
import { BODY_LIMITS, cmToIn, inToCm, kgToLb, lbToKg, type UnitSystem } from '@/lib/nutrition';

import type { TapeInputs } from '../useBodyScan';

type Errors = Partial<Record<keyof TapeInputs, string>>;

const inRange = (v: number | null, min: number, max: number) => v !== null && v >= min && v <= max;

export function validateTape(tape: TapeInputs, units: UnitSystem): Errors {
  const errors: Errors = {};
  const { weightKg: w, heightCm: h } = BODY_LIMITS;
  const fmt = (kg: number) => (units === 'imperial' ? `${Math.round(kgToLb(kg))} lb` : `${kg} kg`);
  if (!inRange(tape.weightKg, w.min, w.max)) {
    errors.weightKg = t('measurements.weightRange', { min: fmt(w.min), max: fmt(w.max) });
  }
  if (!inRange(tape.heightCm, h.min, h.max)) {
    errors.heightCm = t('measurements.heightRange', { min: '100 cm', max: '250 cm' });
  }
  const anyTape = tape.waistCm !== null || tape.neckCm !== null;
  if (
    anyTape &&
    !(
      inRange(tape.waistCm, 30, 250) &&
      inRange(tape.neckCm, 20, 70) &&
      tape.waistCm! > tape.neckCm!
    )
  ) {
    errors.waistCm = t('bodyScan.tapeInvalid');
  }
  return errors;
}

/** Weight and height (prefilled) plus optional tape measurements, in the user's units. */
export function ManualForm({
  tape,
  onChange,
  units,
  onSubmit,
}: {
  tape: TapeInputs;
  onChange: (patch: Partial<TapeInputs>) => void;
  units: UnitSystem;
  onSubmit: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const imperial = units === 'imperial';
  const length = (
    key: 'heightCm' | 'waistCm' | 'neckCm' | 'hipCm',
    label: string,
    hint?: string,
  ) => (
    <NumberField
      label={label}
      hint={hint}
      unit={imperial ? 'in' : 'cm'}
      decimals={1}
      value={tape[key] === null ? null : imperial ? cmToIn(tape[key]!) : tape[key]}
      onChangeValue={(v) => onChange({ [key]: v === null ? null : imperial ? inToCm(v) : v })}
      error={errors[key]}
    />
  );

  return (
    <View className="gap-4">
      <Text tone="muted" className="text-sm leading-6">
        {t('bodyScan.manualIntro')}
      </Text>
      <NumberField
        label={t('measurements.weight')}
        unit={imperial ? t('units.lb') : t('units.kg')}
        value={tape.weightKg === null ? null : imperial ? kgToLb(tape.weightKg) : tape.weightKg}
        onChangeValue={(v) => onChange({ weightKg: v === null ? null : imperial ? lbToKg(v) : v })}
        error={errors.weightKg}
      />
      {length('heightCm', t('measurements.height'))}
      {length('waistCm', t('bodyScan.waist'), t('bodyScan.waistHint'))}
      {length('neckCm', t('bodyScan.neck'), t('bodyScan.neckHint'))}
      {length('hipCm', t('bodyScan.hips'), t('bodyScan.hipsHint'))}
      <Button
        label={t('bodyScan.calculate')}
        className="mt-2"
        onPress={() => {
          const found = validateTape(tape, units);
          setErrors(found);
          if (Object.keys(found).length === 0) onSubmit();
        }}
      />
    </View>
  );
}
