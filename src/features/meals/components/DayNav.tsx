import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { addDays, dayKey } from '@/lib/dates';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

export function dayLabel(day: Date, now: Date): string {
  if (dayKey(day) === dayKey(now)) return t('meals.today');
  if (dayKey(day) === dayKey(addDays(now, -1))) return t('meals.yesterday');
  return day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Previous/next day switcher; the future is not reachable. */
export function DayNav({
  day,
  now,
  onChange,
}: {
  day: Date;
  now: Date;
  onChange: (d: Date) => void;
}) {
  const { colors } = useTheme();
  const isToday = dayKey(day) === dayKey(now);
  const arrow = (dir: -1 | 1) => {
    const disabled = dir === 1 && isToday;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir === -1 ? t('meals.previousDay') : t('meals.nextDay')}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={() => onChange(addDays(day, dir))}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, opacity: disabled ? 0.3 : 1 }}
        className="items-center justify-center rounded-full active:opacity-70"
      >
        <Feather
          name={dir === -1 ? 'chevron-left' : 'chevron-right'}
          size={20}
          color={colors.foreground}
        />
      </Pressable>
    );
  };
  return (
    <View className="mb-3 flex-row items-center justify-between">
      {arrow(-1)}
      <Text variant="label" className="font-bold" accessibilityLiveRegion="polite">
        {dayLabel(day, now)}
      </Text>
      {arrow(1)}
    </View>
  );
}
