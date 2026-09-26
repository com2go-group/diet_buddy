import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Callout, Card, Chip, EmptyState, Text } from '@/components';
import { t, type StringKey } from '@/i18n';

import { listSafety, reviewSafety } from '../api';
import { PageTitle, QueryState, formatDateTime } from './common';

export function SafetyPage() {
  const queryClient = useQueryClient();
  const [showReviewed, setShowReviewed] = useState(false);
  const events = useQuery({
    queryKey: ['admin', 'safety', showReviewed],
    queryFn: () => listSafety(!showReviewed),
  });
  const review = useMutation({
    mutationFn: reviewSafety,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  return (
    <>
      <PageTitle>{t('admin.nav_safety')}</PageTitle>
      <Callout emoji="🛟" tone="info">
        {t('admin.safetyIntro')}
      </Callout>
      <View className="flex-row">
        <Chip
          label={t('admin.safetyOpenOnly')}
          selected={showReviewed}
          onPress={() => setShowReviewed(!showReviewed)}
        />
      </View>
      <QueryState query={events}>
        {(rows) =>
          rows.length ? (
            rows.map((e) => (
              <Card key={e.id} className="flex-row flex-wrap items-center justify-between gap-2">
                <View className="flex-1 gap-0.5">
                  <Text className="font-bold">{t(`admin.safetyFlag_${e.flag}` as StringKey)}</Text>
                  <Text variant="caption" tone="muted">
                    {`${e.email ?? e.user_id} · ${e.persona} · ${formatDateTime(e.created_at)}`}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    label={t('admin.nav_users')}
                    size="md"
                    variant="ghost"
                    onPress={() => router.push(`/admin/users/${e.user_id}` as Href)}
                  />
                  {e.reviewed_at ? null : (
                    <Button
                      label={t('admin.safetyReviewed')}
                      size="md"
                      variant="outline"
                      loading={review.isPending && review.variables === e.id}
                      onPress={() => review.mutate(e.id)}
                    />
                  )}
                </View>
              </Card>
            ))
          ) : (
            <EmptyState emoji="✅" title={t('admin.safetyEmpty')} />
          )
        }
      </QueryState>
    </>
  );
}
