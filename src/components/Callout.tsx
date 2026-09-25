import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from './cn';
import { Text } from './Text';

const tones = {
  primary: 'border-primary/20 bg-primary/10',
  info: 'border-carbs/20 bg-carbs/10',
  purple: 'border-fat/20 bg-fat/10',
  success: 'border-success/20 bg-success/10',
  danger: 'border-destructive/20 bg-destructive/10',
} as const;

export interface CalloutProps {
  emoji?: string;
  tone?: keyof typeof tones;
  children: ReactNode;
  /** Announce changes to screen readers (e.g. safety warnings that appear as the user types). */
  live?: boolean;
  className?: string;
}

/** Tinted note box with an optional emoji, as used for tips and cautions. */
export function Callout({
  emoji,
  tone = 'primary',
  children,
  live = false,
  className,
}: CalloutProps) {
  return (
    <View
      accessibilityLiveRegion={live ? 'polite' : undefined}
      className={cn(
        'flex-row items-start gap-2.5 rounded-2xl border px-4 py-3',
        tones[tone],
        className,
      )}
    >
      {emoji ? (
        <Text accessibilityElementsHidden importantForAccessibility="no">
          {emoji}
        </Text>
      ) : null}
      <View className="flex-1">
        {typeof children === 'string' ? (
          <Text variant="caption" tone="muted" className="text-[13px] leading-5">
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
