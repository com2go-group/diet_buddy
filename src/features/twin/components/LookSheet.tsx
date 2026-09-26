import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, SegmentedControl, Sheet, Text } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import { fullness, HAIR_COLOURS, SKIN_TONES, type TwinLook, type TwinVariant } from '../twin';
import { TwinAvatar } from './TwinAvatar';

function Swatches({
  label,
  colours,
  value,
  optionLabel,
  onChange,
}: {
  label: string;
  colours: readonly string[];
  value: number;
  optionLabel: (n: number) => string;
  onChange: (index: number) => void;
}) {
  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2">
        {colours.map((colour, i) => (
          <Pressable
            key={colour}
            accessibilityRole="radio"
            accessibilityLabel={optionLabel(i + 1)}
            aria-checked={value === i}
            onPress={() => onChange(i)}
            style={{ width: 44, height: 44 }}
            className={
              value === i
                ? 'items-center justify-center rounded-full border-2 border-primary'
                : 'items-center justify-center rounded-full border-2 border-transparent'
            }
          >
            <View
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colour }}
              className="border border-border"
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Style, skin tone and hair colour for the twin, with a live preview. The parent remounts it
 * (new key) on each open so the draft starts from the saved look.
 */
export function LookSheet({
  visible,
  look,
  bodyFatPct,
  saving,
  failed,
  onSave,
  onClose,
}: {
  visible: boolean;
  look: TwinLook;
  bodyFatPct: number;
  saving: boolean;
  failed: boolean;
  onSave: (look: TwinLook) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(look);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('twin.lookTitle')}>
      <View className="gap-4">
        <View className="items-center">
          <TwinAvatar look={draft} fullness={fullness(bodyFatPct, draft.variant)} height={150} />
        </View>
        <View className="gap-2">
          <Text variant="label">{t('twin.variant')}</Text>
          <SegmentedControl<TwinVariant>
            accessibilityLabel={t('twin.variant')}
            options={[
              { value: 'male', label: t('twin.variantMale') },
              { value: 'female', label: t('twin.variantFemale') },
              { value: 'other', label: t('twin.variantOther') },
            ]}
            value={draft.variant}
            onChange={(variant) => setDraft({ ...draft, variant })}
          />
        </View>
        <Swatches
          label={t('twin.skin')}
          colours={SKIN_TONES}
          value={draft.skin}
          optionLabel={(n) => t('twin.skinOption', { n })}
          onChange={(skin) => setDraft({ ...draft, skin })}
        />
        <Swatches
          label={t('twin.hair')}
          colours={HAIR_COLOURS}
          value={draft.hair}
          optionLabel={(n) => t('twin.hairOption', { n })}
          onChange={(hair) => setDraft({ ...draft, hair })}
        />
        <FormMessage message={failed ? t('twin.saveFailed') : undefined} />
        <Button label={t('twin.save')} loading={saving} onPress={() => onSave(draft)} />
      </View>
    </Sheet>
  );
}
