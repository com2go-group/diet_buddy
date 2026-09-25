import { View } from 'react-native';

import { Card } from './Card';
import { Text } from './Text';

export interface KpiTileProps {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  /** Accent color for the value, e.g. a macro color. */
  color?: string;
  size?: 'lg' | 'sm';
  className?: string;
}

/** A labelled number. Large KPIs use the 40–56px bold style (CLAUDE.md §5). */
export function KpiTile({
  label,
  value,
  unit,
  caption,
  color,
  size = 'sm',
  className,
}: KpiTileProps) {
  return (
    <Card
      tone={size === 'sm' ? 'muted' : 'default'}
      className={className}
      accessible
      accessibilityLabel={[label, value, unit, caption].filter(Boolean).join(' ')}
    >
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View className="mt-1 flex-row items-baseline gap-1">
        <Text
          variant={size === 'lg' ? 'kpi' : 'title'}
          style={color ? { color } : undefined}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text variant="caption" tone="muted">
            {unit}
          </Text>
        ) : null}
      </View>
      {caption ? (
        <Text variant="caption" tone="muted" className="mt-1">
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}
