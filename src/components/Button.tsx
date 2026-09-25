import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { haptics } from '@/lib/haptics';
import { brand, MIN_TOUCH_TARGET } from '@/theme';

import { cn } from './cn';
import { GradientFill } from './GradientFill';
import { Text, type TextTone } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

const containers: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-accent',
  outline: 'border border-border bg-card',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive',
};

const labelTones: Record<ButtonVariant, TextTone> = {
  primary: 'inverse',
  secondary: 'accent',
  outline: 'default',
  ghost: 'primary',
  destructive: 'inverse',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  /** Fire a success haptic on press, for significant actions (log meal, complete check-in). */
  hapticOnPress?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  icon,
  hapticOnPress = false,
  fullWidth = true,
  className,
  onPress,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (hapticOnPress) haptics.success();
        onPress?.(e);
      }}
      // A plain object, not a style function: NativeWind drops style functions on components that
      // also take className. Press feedback comes from the active: class instead.
      style={{
        minHeight: MIN_TOUCH_TARGET,
        opacity: isDisabled ? 0.5 : 1,
        ...(variant === 'primary' && !isDisabled
          ? {
              shadowColor: brand.gradient[0],
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }
          : null),
      }}
      className={cn(
        'flex-row items-center justify-center gap-2 overflow-hidden rounded-lg px-5 active:opacity-80',
        size === 'lg' ? 'py-4' : 'py-3',
        fullWidth && 'w-full',
        containers[variant],
        className,
      )}
      {...props}
    >
      {variant === 'primary' && <GradientFill />}
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : brand.gradient[0]}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            variant={size === 'lg' ? 'heading' : 'label'}
            tone={labelTones[variant]}
            className="font-extrabold"
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
