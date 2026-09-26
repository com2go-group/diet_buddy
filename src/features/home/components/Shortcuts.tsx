import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Sheet, Text } from '@/components';
import { t } from '@/i18n';
import { accentColor, useTheme, type Accent } from '@/theme';

const SHORTCUTS = [
  { key: 'grocery', emoji: '🛒', accent: 'green', desc: 'homeScreen.groceryDesc' },
  { key: 'restaurant', emoji: '🍽️', accent: 'blue', desc: 'homeScreen.restaurantDesc' },
  { key: 'subscribe', emoji: '⭐', accent: 'amber', desc: 'homeScreen.subscribeDesc' },
] as const satisfies readonly { key: string; emoji: string; accent: Accent; desc: string }[];

type Shortcut = (typeof SHORTCUTS)[number];

/**
 * Grocery AI, Restaurant and Subscribe shortcuts. Their screens arrive in Phases 2–3, so each
 * opens a short "coming soon" sheet instead of a mock screen.
 */
export function Shortcuts() {
  const { scheme } = useTheme();
  const [open, setOpen] = useState<Shortcut | null>(null);
  return (
    <>
      <View className="mb-4 flex-row gap-2.5">
        {SHORTCUTS.map((s) => {
          const color = accentColor(s.accent, scheme);
          return (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityLabel={t(`homeScreen.${s.key}`)}
              onPress={() => setOpen(s)}
              style={{ backgroundColor: `${color}1A`, borderColor: `${color}38` }}
              className="flex-1 items-center gap-1 rounded-2xl border py-3 active:opacity-80"
            >
              <Text className="text-xl">{s.emoji}</Text>
              <Text variant="caption" className="font-bold" style={{ color }}>
                {t(`homeScreen.${s.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Sheet
        visible={open !== null}
        onClose={() => setOpen(null)}
        title={open ? t(`homeScreen.${open.key}`) : undefined}
      >
        {open ? (
          <View className="gap-3 pb-2">
            <Text>{t(open.desc)}</Text>
            <Text tone="muted">
              {t('homeScreen.comingSoon')} · {t('homeScreen.premiumSoon')}
            </Text>
            <Button label={t('common.close')} variant="outline" onPress={() => setOpen(null)} />
          </View>
        ) : null}
      </Sheet>
    </>
  );
}
