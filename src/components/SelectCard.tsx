import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET } from '@/theme';

import { cn } from './cn';
import { Text } from './Text';

export interface SelectCardProps {
  title: string;
  description?: string;
  emoji?: string;
  /** Small text on the right, e.g. "×1.375" or "0.50 kg/week". */
  trailing?: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  /** 'checkbox' for multi-select lists, 'radio' for single choice. */
  selectionRole?: 'checkbox' | 'radio';
  /** Accent for the selected state; defaults to the primary color. */
  color?: string;
  /** Extra content shown under the text while selected. */
  children?: ReactNode;
}

/** Full-width selectable card, as used for goals, pace, activity and restrictions. */
export function SelectCard({
  title,
  description,
  emoji,
  trailing,
  badge,
  selected,
  onPress,
  selectionRole = 'checkbox',
  color,
  children,
}: SelectCardProps) {
  const accent = selected && color ? { borderColor: color, backgroundColor: `${color}1A` } : null;
  return (
    <Pressable
      accessibilityRole={selectionRole}
      aria-checked={selected}
      accessibilityLabel={[title, description, trailing].filter(Boolean).join(', ')}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[{ minHeight: MIN_TOUCH_TARGET + 12 }, accent]}
      className={cn(
        'rounded-2xl border-[1.5px] px-4 py-3.5 active:opacity-80',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-card',
      )}
    >
      <View className="flex-row items-center gap-3.5">
        {emoji ? <Text className="text-[26px] leading-8">{emoji}</Text> : null}
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              variant="heading"
              className="text-[15px] leading-5"
              tone={selected && !color ? 'primary' : 'default'}
              style={selected && color ? { color } : undefined}
            >
              {title}
            </Text>
            {badge ? (
              <View className="rounded-full bg-primary/15 px-2 py-0.5">
                <Text variant="caption" tone="primary" className="font-extrabold">
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
          {description ? (
            <Text variant="caption" tone="muted" className="mt-0.5 text-[13px] leading-[18px]">
              {description}
            </Text>
          ) : null}
        </View>
        {trailing ? (
          <Text
            variant="caption"
            tone="muted"
            className="font-bold"
            style={selected && color ? { color } : undefined}
          >
            {trailing}
          </Text>
        ) : null}
        <Indicator selected={selected} round={selectionRole === 'radio'} color={color} />
      </View>
      {selected && children ? (
        <View className="mt-2 border-t border-border pt-2">{children}</View>
      ) : null}
    </Pressable>
  );
}

function Indicator({
  selected,
  round,
  color,
}: {
  selected: boolean;
  round: boolean;
  color?: string;
}) {
  return (
    <View
      style={selected && color ? { backgroundColor: color, borderColor: color } : undefined}
      className={cn(
        'h-5 w-5 items-center justify-center border-2',
        round ? 'rounded-full' : 'rounded-md',
        selected ? 'border-primary bg-primary' : 'border-border',
      )}
    >
      {selected ? <Text className="font-extrabold text-[11px] leading-3 text-white">✓</Text> : null}
    </View>
  );
}
