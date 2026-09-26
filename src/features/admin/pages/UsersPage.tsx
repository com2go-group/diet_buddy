import { useInfiniteQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, EmptyState, ErrorState, SkeletonCard, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { listUsers } from '../api';
import { PageTitle, formatDateTime } from './common';

export function UsersPage() {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);
  const users = useInfiniteQuery({
    queryKey: ['admin', 'users', search],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listUsers(search, pageParam),
    getNextPageParam: (last, all) => (last.length === 50 ? all.length * 50 : undefined),
  });
  const rows = users.data?.pages.flat() ?? [];

  return (
    <>
      <PageTitle>{t('admin.nav_users')}</PageTitle>
      <TextField
        label={t('admin.usersSearch')}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
      />
      {users.isPending ? (
        <SkeletonCard lines={5} />
      ) : users.isError ? (
        <ErrorState message={t('admin.loadFailed')} onRetry={() => users.refetch()} />
      ) : !rows.length ? (
        <EmptyState emoji="🔍" title={t('admin.usersEmpty')} />
      ) : (
        <View className="gap-2">
          {rows.map((u) => (
            <Pressable
              key={u.user_id}
              accessibilityRole="link"
              onPress={() => router.push(`/admin/users/${u.user_id}` as Href)}
              className="flex-row flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 active:opacity-80"
            >
              <View className="flex-1">
                <Text className="font-semibold">{u.email ?? u.phone ?? u.user_id}</Text>
                <Text variant="caption" tone="muted">
                  {[u.name, t('admin.userJoined', { date: formatDateTime(u.created_at) })]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text variant="caption" className="font-semibold">
                {[
                  u.admin_role ? t(`admin.role_${u.admin_role}`) : null,
                  u.is_premium ? t('admin.userPremium') : null,
                  u.banned ? t('admin.userBanned') : null,
                  `${u.xp} XP`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Pressable>
          ))}
          {users.hasNextPage ? (
            <Button
              label={t('admin.usersMore')}
              variant="outline"
              loading={users.isFetchingNextPage}
              onPress={() => users.fetchNextPage()}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
