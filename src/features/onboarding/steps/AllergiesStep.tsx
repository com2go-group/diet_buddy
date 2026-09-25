import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text, TextField } from '@/components';
import { t } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET } from '@/theme';

import { toggleOption } from '../draft';
import { ALLERGIES } from '../foodOptions';
import { NoneButton } from './DietStep';
import { StepHeader, type StepProps } from './shared';

function AllergyChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={active}
      accessibilityLabel={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={{ minHeight: MIN_TOUCH_TARGET }}
      className={
        active
          ? 'justify-center rounded-full border-[1.5px] border-destructive bg-destructive/10 px-3.5'
          : 'justify-center rounded-full border-[1.5px] border-border bg-card px-3.5'
      }
    >
      <Text variant="label" tone={active ? 'destructive' : 'default'} className="font-bold">
        {active ? '⚠️ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function AllergiesStep({ draft, update }: StepProps) {
  const [custom, setCustom] = useState('');
  const add = () => {
    const value = custom.trim();
    if (!value) return;
    if (!draft.customAllergies.some((a) => a.toLowerCase() === value.toLowerCase())) {
      update({ customAllergies: [...draft.customAllergies, value.slice(0, 40)] });
    }
    setCustom('');
  };
  const labels = [
    ...draft.allergies.map((id) => t(`onboardingAllergies.${id}` as `onboardingAllergies.peanuts`)),
    ...draft.customAllergies,
  ];

  return (
    <>
      <StepHeader emoji="⚠️" title={t('allergies.title')} subtitle={t('allergies.subtitle')} />
      <View className="mb-4 flex-row flex-wrap gap-2">
        {ALLERGIES.map((id) => (
          <AllergyChip
            key={id}
            label={t(`onboardingAllergies.${id}`)}
            active={draft.allergies.includes(id)}
            onPress={() => update({ allergies: toggleOption(draft.allergies, id) })}
          />
        ))}
        {draft.customAllergies.map((a) => (
          <AllergyChip
            key={a}
            label={a}
            active
            onPress={() =>
              update({ customAllergies: draft.customAllergies.filter((x) => x !== a) })
            }
          />
        ))}
      </View>
      <View className="flex-row items-end gap-2">
        <TextField
          className="flex-1"
          label={t('allergies.add')}
          placeholder={t('allergies.customPlaceholder')}
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={add}
          returnKeyType="done"
          maxLength={40}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('allergies.add')}
          onPress={add}
          style={{ width: MIN_TOUCH_TARGET + 6, height: MIN_TOUCH_TARGET + 6 }}
          className="items-center justify-center rounded-md bg-primary active:opacity-80"
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      {labels.length > 0 ? (
        <View
          className="mt-4 rounded-2xl border border-destructive/15 bg-destructive/5 p-3.5"
          accessible
        >
          <Text variant="caption" tone="destructive" className="mb-1.5 font-bold">
            {t('allergies.strictly')}
          </Text>
          <Text variant="label" className="font-normal">
            {labels.join(', ')}
          </Text>
        </View>
      ) : null}
      <View className="mt-3">
        <NoneButton
          label={t('allergies.none')}
          onPress={() => update({ allergies: [], customAllergies: [] })}
        />
      </View>
    </>
  );
}
