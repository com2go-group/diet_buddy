import type { ReactNode } from 'react';
import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components';
import { t, type StringKey } from '@/i18n';

import { NotificationBell } from '../notifications';

/** Placeholder for a tab whose screen arrives in a later Phase 1 step. */
export function ComingNext({
  title,
  description,
  emoji,
  children,
}: {
  title: StringKey;
  description: StringKey;
  emoji: string;
  children?: ReactNode;
}) {
  return (
    <Screen contentClassName="gap-4">
      <View className="flex-row items-center justify-between pb-2 pt-3">
        <Text variant="title" accessibilityRole="header" className="text-[22px]">
          {t(title)}
        </Text>
        <NotificationBell />
      </View>
      <EmptyState emoji={emoji} title={t('tabs.comingNext')} message={t(description)} />
      {children}
    </Screen>
  );
}
