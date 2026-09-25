import { View } from 'react-native';

import { Callout, DateField, SelectCard } from '@/components';
import { t } from '@/i18n';
import { formatMonthYear } from '@/lib/format';
import { computePlan } from '@/lib/nutrition';

import { goalDateFrom, previewInputFrom } from '../draft';
import { GOAL_DATES } from '../options';
import { errorText, StepHeader, type StepProps } from './shared';

export function GoalDateStep({ draft, update, errors, formatWeight }: StepProps) {
  const input = draft.goals.includes('lose_fat') ? previewInputFrom(draft) : null;
  const forecast = input ? computePlan(input).timeline : null;
  const target = goalDateFrom(draft);

  return (
    <>
      <StepHeader emoji="📅" title={t('goalDate.title')} subtitle={t('goalDate.subtitle')} />
      <View className="gap-2.5">
        {GOAL_DATES.map((option) => (
          <SelectCard
            key={option.id}
            title={t(`onboardingOptions.${option.id}`)}
            trailing={option.months ? t(`onboardingOptions.${option.id}Sub`) : undefined}
            selectionRole="radio"
            selected={draft.goalDate === option.id}
            onPress={() => update({ goalDate: option.id })}
          />
        ))}
        {draft.goalDate === 'custom' ? (
          <DateField
            label={t('goalDate.customLabel')}
            value={draft.customGoalDate}
            onChange={(customGoalDate) => update({ customGoalDate })}
            error={errorText(errors.customGoalDate)}
          />
        ) : null}
        {forecast && draft.goalWeightKg ? (
          <Callout emoji="🗓️" live className="mt-1">
            {target && target < forecast.goalDate
              ? t('goalDate.tooSoon', { date: formatMonthYear(forecast.goalDate) })
              : t('goalDate.paceNote', {
                  weight: formatWeight(draft.goalWeightKg, 0),
                  date: formatMonthYear(forecast.goalDate),
                })}
          </Callout>
        ) : null}
      </View>
    </>
  );
}
