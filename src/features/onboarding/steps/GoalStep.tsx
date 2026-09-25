import { View } from 'react-native';

import { Callout, SelectCard } from '@/components';
import { t } from '@/i18n';

import { toggleGoal } from '../draft';
import { GOALS } from '../options';
import { FieldError, SelectionSummary, StepHeader, type StepProps } from './shared';

export function GoalStep({ draft, update, errors }: StepProps) {
  return (
    <>
      <StepHeader emoji="🎯" title={t('goal.title')} subtitle={t('goal.subtitle')} />
      <SelectionSummary
        count={draft.goals.length}
        emptyLabel={t('onboarding.tapToSelectMany')}
        onClear={() => update({ goals: [], goalWeightKg: null, pace: 'balanced' })}
      />
      <View className="gap-2.5">
        {GOALS.map((goal) => (
          <SelectCard
            key={goal.id}
            emoji={goal.emoji}
            title={t(`onboardingOptions.${goal.id}`)}
            description={t(`onboardingOptions.${goal.id}Desc`)}
            selected={draft.goals.includes(goal.id)}
            onPress={() => update(toggleGoal(draft, goal.id))}
          />
        ))}
      </View>
      <FieldError error={errors.goals} />
      <View className="mt-3 gap-2">
        {draft.goals.includes('lose_fat') ? (
          <Callout emoji="🏁">{t('goal.loseFatNote')}</Callout>
        ) : null}
        {draft.goals.length > 1 ? (
          <Callout emoji="🧠" tone="purple">
            {t('goal.blendNote')}
          </Callout>
        ) : null}
      </View>
    </>
  );
}
