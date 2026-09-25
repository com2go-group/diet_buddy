import { View } from 'react-native';

import { SelectCard, SelectTile, TileGrid } from '@/components';
import { t } from '@/i18n';

import { ACTIVITY_LEVELS, TRAINING_FREQUENCIES } from '../options';
import { FieldError, StepHeader, type StepProps } from './shared';

export function ActivityStep({ draft, update, errors }: StepProps) {
  return (
    <>
      <StepHeader emoji="🏃" title={t('activity.title')} subtitle={t('activity.subtitle')} />
      <View className="gap-2.5" accessibilityRole="radiogroup">
        {ACTIVITY_LEVELS.map((level) => (
          <SelectCard
            key={level.id}
            title={t(`onboardingOptions.${level.id}`)}
            description={t(`onboardingOptions.${level.id}Desc`)}
            trailing={`×${level.multiplier}`}
            selectionRole="radio"
            selected={draft.activity === level.id}
            onPress={() => update({ activity: level.id })}
          />
        ))}
      </View>
      <FieldError error={errors.activity} />
    </>
  );
}

export function TrainingStep({ draft, update, errors }: StepProps) {
  return (
    <>
      <StepHeader emoji="🏋️" title={t('training.title')} subtitle={t('training.subtitle')} />
      <TileGrid>
        {TRAINING_FREQUENCIES.map((f) => (
          <SelectTile
            key={f}
            align="start"
            selectionRole="radio"
            label={t(`onboardingOptions.${f}`)}
            description={t(`onboardingOptions.${f}Desc`)}
            selected={draft.training === f}
            onPress={() => update({ training: f })}
          />
        ))}
      </TileGrid>
      <FieldError error={errors.training} />
    </>
  );
}
