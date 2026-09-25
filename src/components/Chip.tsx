import { Pressable, type PressableProps } from 'react-native';

import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET } from '@/theme';

import { cn } from './cn';
import { Text } from './Text';

export interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected: boolean;
  emoji?: string;
  /** 'checkbox' for multi-select groups, 'radio' for single-select. */
  selectionRole?: 'checkbox' | 'radio';
  className?: string;
}

/** Selectable pill used for goals, diet styles, restrictions and similar option lists. */
export function Chip({
  label,
  selected,
  emoji,
  selectionRole = 'checkbox',
  className,
  onPress,
  ...props
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole={selectionRole}
      accessibilityLabel={label}
      aria-checked={selected}
      onPress={(e) => {
        haptics.selection();
        onPress?.(e);
      }}
      style={{ minHeight: MIN_TOUCH_TARGET }}
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2.5',
        selected ? 'border-primary bg-accent' : 'border-border bg-card',
        className,
      )}
      {...props}
    >
      {emoji ? <Text variant="label">{emoji}</Text> : null}
      <Text variant="label" tone={selected ? 'accent' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}
