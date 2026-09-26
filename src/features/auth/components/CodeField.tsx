import { TextInput, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

export interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

/**
 * Single 6-digit input. One field (not six boxes) so SMS/email one-time-code autofill and screen
 * readers work reliably.
 */
export function CodeField({ value, onChange, error, autoFocus = true }: CodeFieldProps) {
  const { colors } = useTheme();
  return (
    <View className="gap-1.5">
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus={autoFocus}
        placeholder="••••••"
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={t('auth.code')}
        testID={t('auth.code')}
        accessibilityHint={error}
        maxFontSizeMultiplier={1.4}
        style={{ color: colors.foreground, letterSpacing: 12, minHeight: 64 }}
        className={`rounded-lg border-[1.5px] bg-muted text-center font-extrabold text-3xl ${
          error ? 'border-destructive' : 'border-border'
        }`}
      />
      {error ? (
        <Text variant="caption" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
