import { useRef } from 'react';
import { TextInput, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

export interface BirthDateValue {
  day: string;
  month: string;
  year: string;
}

export interface BirthDateFieldProps {
  value: BirthDateValue;
  onChange: (value: BirthDateValue) => void;
  onBlur?: () => void;
  error?: string;
}

const parts = [
  { key: 'day', label: 'auth.day', placeholder: 'DD', maxLength: 2, flex: 1 },
  { key: 'month', label: 'auth.month', placeholder: 'MM', maxLength: 2, flex: 1 },
  { key: 'year', label: 'auth.year', placeholder: 'YYYY', maxLength: 4, flex: 1.6 },
] as const;

/** Day / month / year number fields (EU order). Moves to the next field when one is full. */
export function BirthDateField({ value, onChange, onBlur, error }: BirthDateFieldProps) {
  const { colors } = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);
  return (
    <View className="gap-1.5">
      <Text variant="label">{t('auth.birthDate')}</Text>
      <View className="flex-row gap-2">
        {parts.map((part, index) => (
          <TextInput
            key={part.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            value={value[part.key]}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, part.maxLength);
              onChange({ ...value, [part.key]: digits });
              if (digits.length === part.maxLength) refs.current[index + 1]?.focus();
            }}
            onBlur={onBlur}
            keyboardType="number-pad"
            maxLength={part.maxLength}
            placeholder={part.placeholder}
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel={`${t('auth.birthDate')}, ${t(part.label)}`}
            textContentType={part.key === 'year' ? undefined : 'none'}
            maxFontSizeMultiplier={1.8}
            // minWidth 0 lets the inputs shrink to fit; web inputs otherwise keep an intrinsic width.
            style={{
              flex: part.flex,
              minWidth: 0,
              minHeight: MIN_TOUCH_TARGET + 6,
              color: colors.foreground,
            }}
            className={`rounded-md border-[1.5px] bg-muted px-4 text-center font-sans text-base ${
              error ? 'border-destructive' : 'border-border'
            }`}
          />
        ))}
      </View>
      <Text
        variant="caption"
        tone={error ? 'destructive' : 'muted'}
        accessibilityLiveRegion="polite"
      >
        {error ?? t('auth.birthDateHint')}
      </Text>
    </View>
  );
}
