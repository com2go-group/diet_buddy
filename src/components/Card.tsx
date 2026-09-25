import { View, type ViewProps } from 'react-native';

import { cn } from './cn';

export interface CardProps extends ViewProps {
  className?: string;
  /** Tinted accent background instead of the card surface. */
  tone?: 'default' | 'accent' | 'muted';
}

const tones = {
  default: 'bg-card',
  accent: 'bg-accent',
  muted: 'bg-muted',
} as const;

/** Rounded, softly shadowed surface. */
export function Card({ className, tone = 'default', style, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-2xl border border-border p-4', tones[tone], className)}
      style={[
        {
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
      {...props}
    />
  );
}
