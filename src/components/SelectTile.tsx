import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET } from '@/theme';

import { cn } from './cn';
import { Text } from './Text';

export interface SelectTileProps {
  label: string;
  description?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  selectionRole?: 'checkbox' | 'radio';
  align?: 'center' | 'start';
  className?: string;
}

/** Grid tile (emoji + label), as used for motivations, diet styles and training frequency. */
export function SelectTile({
  label,
  description,
  emoji,
  selected,
  onPress,
  selectionRole = 'checkbox',
  align = 'center',
  className,
}: SelectTileProps) {
  return (
    <Pressable
      accessibilityRole={selectionRole}
      aria-checked={selected}
      accessibilityLabel={[label, description].filter(Boolean).join(', ')}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={{ minHeight: MIN_TOUCH_TARGET + 20 }}
      className={cn(
        'flex-1 gap-1.5 rounded-2xl border-[1.5px] px-3 py-4 active:opacity-80',
        align === 'center' ? 'items-center justify-center' : 'items-start justify-center',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-card',
        className,
      )}
    >
      {selected && selectionRole === 'checkbox' ? (
        <View className="absolute right-2 top-2 h-4 w-4 items-center justify-center rounded-md bg-primary">
          <Text className="font-extrabold text-[9px] leading-3 text-white">✓</Text>
        </View>
      ) : null}
      {emoji ? <Text className="text-[28px] leading-9">{emoji}</Text> : null}
      <Text
        variant="label"
        tone={selected ? 'primary' : 'default'}
        className={cn('font-bold', align === 'center' && 'text-center')}
      >
        {label}
      </Text>
      {description ? (
        <Text
          variant="caption"
          tone="muted"
          className={align === 'center' ? 'text-center' : undefined}
        >
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Two-column grid wrapper for SelectTile. */
export function TileGrid({ children }: { children: React.ReactNode[] }) {
  const rows: React.ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % 2 === 0) rows.push([child]);
    else rows[rows.length - 1]!.push(child);
  });
  return (
    <View className="gap-2.5">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-2.5">
          {row}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}
