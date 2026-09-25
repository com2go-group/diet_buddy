import { View } from 'react-native';

import { Callout, NumberField, SegmentedControl, Text } from '@/components';
import { t } from '@/i18n';
import {
  bmi,
  bmiCategory,
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
  type UnitSystem,
} from '@/lib/nutrition';

import { errorText, StepHeader, type StepProps } from './shared';

export function MeasurementsStep({ draft, update, errors }: StepProps) {
  const imperial = draft.units === 'imperial';
  const { weightKg, heightCm } = draft;
  const currentBmi =
    weightKg && heightCm && weightKg >= 30 && heightCm >= 100 ? bmi(weightKg, heightCm) : null;
  const category = currentBmi ? bmiCategory(currentBmi) : null;
  const feetInches = heightCm ? cmToFeetInches(heightCm) : null;

  return (
    <>
      <StepHeader
        emoji="⚖️"
        title={t('measurements.title')}
        subtitle={t('measurements.subtitle')}
      />
      <View className="gap-4">
        <SegmentedControl<UnitSystem>
          accessibilityLabel={t('measurements.units')}
          value={draft.units}
          onChange={(units) => update({ units })}
          options={[
            { value: 'metric', label: t('measurements.metric') },
            { value: 'imperial', label: t('measurements.imperial') },
          ]}
        />
        <NumberField
          key={`weight-${draft.units}`}
          label={t('measurements.weight')}
          placeholder={imperial ? '165' : '75'}
          unit={imperial ? t('units.lb') : t('units.kg')}
          value={weightKg === null ? null : imperial ? kgToLb(weightKg) : weightKg}
          onChangeValue={(v) => update({ weightKg: v === null ? null : imperial ? lbToKg(v) : v })}
          error={errorText(errors.weight)}
        />
        {imperial ? (
          <View className="flex-row gap-3" key="height-imperial">
            <NumberField
              className="flex-1"
              label={`${t('measurements.height')} (${t('measurements.feet')})`}
              placeholder="5"
              unit="ft"
              decimals={0}
              value={feetInches?.feet ?? null}
              onChangeValue={(ft) =>
                update({
                  heightCm: ft === null ? null : feetInchesToCm(ft, feetInches?.inches ?? 0),
                })
              }
              error={errorText(errors.height)}
            />
            <NumberField
              className="flex-1"
              label={t('measurements.inches')}
              placeholder="7"
              unit="in"
              decimals={0}
              value={feetInches?.inches ?? null}
              onChangeValue={(inches) =>
                update({ heightCm: feetInchesToCm(feetInches?.feet ?? 0, inches ?? 0) })
              }
            />
          </View>
        ) : (
          <NumberField
            key="height-metric"
            label={t('measurements.height')}
            placeholder="170"
            unit={t('units.cm')}
            decimals={0}
            value={heightCm}
            onChangeValue={(v) => update({ heightCm: v })}
            error={errorText(errors.height)}
          />
        )}
        {currentBmi && category ? (
          <View
            accessible
            className="flex-row items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3.5"
          >
            <Text tone="muted" className="text-sm">
              {t('measurements.bmi')}
            </Text>
            <Text variant="heading" tone="primary" className="font-extrabold">
              {currentBmi.toFixed(1)} · {t(`measurements.${category}`)}
            </Text>
          </View>
        ) : null}
        {category === 'underweight' ? (
          <Callout emoji="🩺" tone="danger" live>
            {t('measurements.underweightWarning')}
          </Callout>
        ) : null}
      </View>
    </>
  );
}
