import { View } from 'react-native';

import { Callout, NumberField, Text } from '@/components';
import { t } from '@/i18n';
import { ageOn, bmi, estimateBodyFatPct, kgToLb, lbToKg } from '@/lib/nutrition';

import { partsToDate } from '../draft';
import { errorText, StepHeader, type StepProps } from './shared';

export function GoalWeightStep({ draft, update, errors, formatWeight }: StepProps) {
  const imperial = draft.units === 'imperial';
  const { weightKg, heightCm, goalWeightKg } = draft;
  const birth = partsToDate(draft.birthDate);
  const valid =
    weightKg && heightCm && birth && goalWeightKg && goalWeightKg >= 30 && goalWeightKg < weightKg;

  const stats = valid
    ? [
        {
          label: t('goalWeight.toLose'),
          value: formatWeight(weightKg - goalWeightKg),
          color: '#EF4444',
        },
        {
          label: t('goalWeight.goalBmi'),
          value: bmi(goalWeightKg, heightCm).toFixed(1),
          color: '#10B981',
        },
        {
          label: t('goalWeight.bodyFat'),
          value: `~${Math.round(
            estimateBodyFatPct({
              sex: draft.sex ?? 'unspecified',
              ageYears: ageOn(birth),
              heightCm,
              weightKg: goalWeightKg,
            }),
          )}%`,
          color: '#8B5CF6',
        },
      ]
    : [];

  return (
    <>
      <StepHeader emoji="🏁" title={t('goalWeight.title')} subtitle={t('goalWeight.subtitle')} />
      <View className="gap-4">
        <NumberField
          label={t('goalWeight.label')}
          placeholder={imperial ? '150' : '68'}
          unit={imperial ? t('units.lb') : t('units.kg')}
          value={goalWeightKg === null ? null : imperial ? kgToLb(goalWeightKg) : goalWeightKg}
          onChangeValue={(v) =>
            update({ goalWeightKg: v === null ? null : imperial ? lbToKg(v) : v })
          }
          error={errorText(errors.goalWeight)}
          style={{ fontSize: 34, lineHeight: 40, textAlign: 'center', paddingVertical: 20 }}
          className="font-extrabold"
        />
        {stats.length > 0 ? (
          <>
            <View className="flex-row gap-2">
              {stats.map((s) => (
                <View
                  key={s.label}
                  accessible
                  accessibilityLabel={`${s.label}: ${s.value}`}
                  className="flex-1 items-center rounded-2xl border border-border bg-card px-2 py-3"
                >
                  <Text variant="heading" className="font-extrabold" style={{ color: s.color }}>
                    {s.value}
                  </Text>
                  <Text variant="caption" tone="muted" className="mt-0.5 text-center">
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
            <Callout emoji="💡">{t('goalWeight.tip')}</Callout>
          </>
        ) : null}
      </View>
    </>
  );
}
