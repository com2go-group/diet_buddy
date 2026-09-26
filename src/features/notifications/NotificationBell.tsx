import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, EmptyState, ErrorState, Sheet, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatLongDate } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { useNotifications } from './useNotifications';

/** Bell shown top-right on every main-app screen (CLAUDE.md §6); opens the notifications sheet. */
export function NotificationBell() {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { query, unread, markAllRead } = useNotifications();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread ? t('notifications.openUnread', { count: unread }) : t('notifications.open')
        }
        onPress={() => setOpen(true)}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        className="items-center justify-center rounded-full border border-border bg-card active:opacity-70"
      >
        <Feather name="bell" size={18} color={colors.foreground} />
        {unread > 0 ? (
          <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
        ) : null}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('notifications.title')}>
        {query.isPending ? (
          <SkeletonCard lines={3} />
        ) : query.isError ? (
          <ErrorState message={t('notifications.loadFailed')} onRetry={() => query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            emoji="🔔"
            title={t('notifications.empty')}
            message={t('notifications.emptyDesc')}
          />
        ) : (
          <ScrollView style={{ flexGrow: 0 }} contentContainerClassName="gap-2 pb-2">
            {unread > 0 ? (
              <Button
                variant="ghost"
                size="md"
                label={t('notifications.markAllRead')}
                onPress={markAllRead}
              />
            ) : null}
            {query.data.map((n) => (
              <View
                key={n.id}
                accessible
                className={`rounded-2xl border p-3.5 ${n.read_at ? 'border-border bg-card' : 'border-primary/30 bg-primary/5'}`}
              >
                <Text variant="label" className="font-bold">
                  {n.title}
                </Text>
                {n.body ? (
                  <Text variant="caption" tone="muted" className="mt-0.5 text-[13px] leading-5">
                    {n.body}
                  </Text>
                ) : null}
                <Text variant="caption" tone="muted" className="mt-1">
                  {formatLongDate(new Date(n.created_at))}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Sheet>
    </>
  );
}
