import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET } from '@/theme';

import { cn } from './cn';
import { Text } from './Text';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name for the group, e.g. "Sign in or sign up". */
  accessibilityLabel: string;
  className?: string;
}

/** Pill-style tabs, as used for Sign In / Sign Up and Email / Phone. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row rounded-lg bg-muted p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={{ minHeight: MIN_TOUCH_TARGET }}
            className={cn(
              'flex-1 items-center justify-center rounded-md',
              selected && 'bg-card shadow-sm',
            )}
          >
            <Text variant="label" tone={selected ? 'default' : 'muted'} className="font-bold">
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
