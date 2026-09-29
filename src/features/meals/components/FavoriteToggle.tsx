import { Feather } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { ACCENTS, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { useFavorites } from '../favorites';
import type { PortionFood } from '../types';

/** Star / unstar the food being logged. */
export function FavoriteToggle({ food }: { food: PortionFood }) {
  const { colors, scheme } = useTheme();
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(food);
  return (
    <Pressable
      accessibilityRole="switch"
      aria-checked={on}
      aria-busy={toggle.isPending}
      accessibilityLabel={t('logFood.favorite')}
      disabled={toggle.isPending}
      onPress={() => toggle.mutate(food)}
      style={{ minHeight: MIN_TOUCH_TARGET }}
      className="mb-2 flex-row items-center gap-2 self-start rounded-full px-1 active:opacity-70"
    >
      <Feather name="star" size={18} color={on ? ACCENTS.amber[scheme] : colors.mutedForeground} />
      <Text variant="caption" className="font-semibold">
        {on ? t('logFood.favoriteOn') : t('logFood.favoriteOff')}
      </Text>
    </Pressable>
  );
}
