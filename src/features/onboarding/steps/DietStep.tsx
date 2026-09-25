import { Pressable, View } from 'react-native';

import { Callout, SelectCard, SelectTile, Text, TextField, TileGrid } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET } from '@/theme';

import { toggleOption } from '../draft';
import { DIET_STYLES, RESTRICTIONS } from '../options';
import { SelectionSummary, StepHeader, type StepProps } from './shared';

export function DietStep({ draft, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="🥗" title={t('diet.title')} subtitle={t('diet.subtitle')} />
      <SelectionSummary
        count={draft.dietStyles.length}
        emptyLabel={t('onboarding.tapToSelect')}
        onClear={() => update({ dietStyles: [] })}
      />
      <TileGrid>
        {DIET_STYLES.map((d) => (
          <SelectTile
            key={d.id}
            emoji={d.emoji}
            label={t(`onboardingOptions.${d.id}`)}
            selected={draft.dietStyles.includes(d.id)}
            // "No preference" can't be combined with a specific style.
            onPress={() =>
              update({ dietStyles: toggleOption(draft.dietStyles, d.id, 'no_preference') })
            }
          />
        ))}
      </TileGrid>
      {draft.dietStyles.length > 1 ? (
        <Callout emoji="🧠" className="mt-3">
          {t('diet.blendNote')}
        </Callout>
      ) : null}
    </>
  );
}

/** Dashed "No restrictions" / "No allergies" button that clears a list. */
export function NoneButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH_TARGET + 4 }}
      className="items-center justify-center rounded-2xl border-[1.5px] border-dashed border-border active:opacity-70"
    >
      <Text tone="muted" className="font-semibold text-sm">
        {label}
      </Text>
    </Pressable>
  );
}

export function RestrictionsStep({ draft, update }: StepProps) {
  return (
    <>
      <StepHeader
        emoji="🚫"
        title={t('restrictions.title')}
        subtitle={t('restrictions.subtitle')}
      />
      <View className="gap-2.5">
        {RESTRICTIONS.map((r) => (
          <SelectCard
            key={r}
            title={t(`onboardingOptions.${r}`)}
            selected={draft.restrictions.includes(r)}
            onPress={() => update({ restrictions: toggleOption(draft.restrictions, r) })}
          />
        ))}
        {draft.restrictions.includes('other') ? (
          <TextField
            label={t('onboardingOptions.other')}
            placeholder={t('restrictions.otherPlaceholder')}
            value={draft.restrictionOther}
            onChangeText={(restrictionOther) => update({ restrictionOther })}
            maxLength={200}
          />
        ) : null}
        <NoneButton
          label={t('restrictions.none')}
          onPress={() => update({ restrictions: [], restrictionOther: '' })}
        />
      </View>
    </>
  );
}
