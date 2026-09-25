import { View } from 'react-native';

import { SelectTile, TextField, TileGrid } from '@/components';
import { t } from '@/i18n';

import { toggleOption } from '../draft';
import { MOTIVATIONS } from '../options';
import { StepHeader, type StepProps } from './shared';

export function MotivationStep({ draft, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="✨" title={t('motivation.title')} subtitle={t('motivation.subtitle')} />
      <TileGrid>
        {MOTIVATIONS.map((m) => (
          <SelectTile
            key={m.id}
            emoji={m.emoji}
            label={t(`onboardingOptions.${m.id}`)}
            selected={draft.motivations.includes(m.id)}
            onPress={() => update({ motivations: toggleOption(draft.motivations, m.id) })}
          />
        ))}
      </TileGrid>
      {draft.motivations.includes('other') ? (
        <View className="mt-3">
          <TextField
            label={t('onboardingOptions.other')}
            placeholder={t('motivation.otherPlaceholder')}
            value={draft.motivationOther}
            onChangeText={(motivationOther) => update({ motivationOther })}
            maxLength={200}
          />
        </View>
      ) : null}
    </>
  );
}
