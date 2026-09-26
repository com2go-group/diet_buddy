import { Feather } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { cn } from './cn';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  /** Already-translated error message. */
  error?: string;
  hint?: string;
  /** Adds a show/hide toggle and hides the text by default. */
  password?: boolean;
  /** Optional link or action shown to the right of the label, e.g. "Forgot password?". */
  labelAction?: React.ReactNode;
  /** Content inside the field after the text, e.g. a unit label. */
  trailing?: React.ReactNode;
  className?: string;
}

/** Labelled text input with hint and error, themed for light and dark. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, password = false, labelAction, trailing, className, style, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(password);
  const [focused, setFocused] = useState(false);
  return (
    <View className={cn('gap-1.5', className)}>
      <View className="flex-row items-center justify-between">
        <Text variant="label">{label}</Text>
        {labelAction}
      </View>
      <View
        className={cn(
          'flex-row items-center rounded-md border-[1.5px] bg-muted',
          error ? 'border-destructive' : focused ? 'border-primary' : 'border-border',
        )}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={hidden}
          maxFontSizeMultiplier={1.8}
          style={[
            // The whole field (input + unit/trailing) shows focus via its border, so the web
            // browser outline, which would wrap only the input, is turned off.
            {
              minWidth: 0,
              minHeight: MIN_TOUCH_TARGET + 6,
              color: colors.foreground,
              ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
            },
            style,
          ]}
          className="flex-1 px-4 py-3.5 font-sans text-base"
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {trailing}
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('auth.showPassword') : t('auth.hidePassword')}
            style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
            className="items-center justify-center"
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
