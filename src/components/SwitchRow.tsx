import { Pressable, Switch, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { Text } from './Text';

export interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A setting with a switch. The whole row toggles it, so the touch target is the row, not the
 * small switch; screen readers use the switch itself, which carries its own state.
 */
export function SwitchRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
  className,
}: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessible={false}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={{ minHeight: MIN_TOUCH_TARGET }}
      className={`flex-row items-center gap-3 ${className ?? ''}`}
    >
      <View className="flex-1">
        <Text variant="label" className="font-semibold text-[15px]">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted" className="text-[13px]">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={description}
        value={value}
        disabled={disabled}
        aria-disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.mutedForeground }}
        thumbColor="#FFFFFF"
      />
    </Pressable>
  );
}
