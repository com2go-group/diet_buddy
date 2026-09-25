import { View } from 'react-native';

import { DateField, SelectCard, Text, TextField } from '@/components';
import { t } from '@/i18n';
import type { Sex } from '@/lib/nutrition';

import { errorText, FieldError, StepHeader, type StepProps } from './shared';

const SEXES: readonly {
  id: Sex;
  label: 'personal.male' | 'personal.female' | 'personal.unspecified';
}[] = [
  { id: 'female', label: 'personal.female' },
  { id: 'male', label: 'personal.male' },
  { id: 'unspecified', label: 'personal.unspecified' },
];

export function PersonalStep({ draft, update, errors }: StepProps) {
  return (
    <>
      <StepHeader emoji="👤" title={t('personal.title')} subtitle={t('personal.subtitle')} />
      <View className="gap-4">
        <TextField
          label={t('auth.fullName')}
          placeholder={t('auth.fullNamePlaceholder')}
          value={draft.name}
          onChangeText={(name) => update({ name })}
          error={errorText(errors.name)}
          autoComplete="name"
          autoCapitalize="words"
        />
        <DateField
          label={t('auth.birthDate')}
          hint={t('auth.birthDateHint')}
          value={draft.birthDate}
          onChange={(birthDate) => update({ birthDate })}
          error={errorText(errors.birthDate)}
        />
        <View accessibilityRole="radiogroup" accessibilityLabel={t('personal.sex')}>
          <Text variant="label">{t('personal.sex')}</Text>
          <Text variant="caption" tone="muted" className="mb-2">
            {t('personal.sexHint')}
          </Text>
          <View className="gap-2">
            {SEXES.map((option) => (
              <SelectCard
                key={option.id}
                title={t(option.label)}
                selectionRole="radio"
                selected={draft.sex === option.id}
                onPress={() => update({ sex: option.id })}
              />
            ))}
          </View>
          <FieldError error={errors.sex} />
        </View>
      </View>
    </>
  );
}
