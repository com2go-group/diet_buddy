import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { Button, Callout, EmptyState, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatShortDate } from '@/lib/format';
import { pickPhoto } from '@/lib/images';
import type { UnitSystem } from '@/lib/nutrition';

import { FormMessage } from '../../auth/components/FormMessage';
import { usePremium } from '../../subscriptions/usePremium';
import type { MetricRow } from '../stats';
import type { ProgressPhoto } from './api';
import { weightNear } from './compare';
import { PhotoCompare } from './PhotoCompare';
import { PhotoViewer } from './PhotoViewer';
import { usePhotos } from './usePhotos';

const NOTICE = {
  denied: 'progress.photosDenied',
  tooLarge: 'progress.photosTooLarge',
  unsupported: 'progress.photosUnsupported',
} as const;

/** Private progress photos: add, view, delete; before/after comparison is Premium. */
export function PhotosSection({ metrics, units }: { metrics: MetricRow[]; units: UnitSystem }) {
  const { query, add, remove } = usePhotos();
  const { premium } = usePremium();
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<ProgressPhoto | null>(null);

  const start = async (source: 'camera' | 'library') => {
    setNotice(null);
    add.reset();
    const picked = await pickPhoto(source, 0.6).catch(() => ({ kind: 'cancelled' as const }));
    if (picked.kind === 'photo') add.mutate(picked);
    else if (picked.kind !== 'cancelled') setNotice(t(NOTICE[picked.kind]));
  };

  const photos = query.data ?? [];
  const body = () => {
    if (query.isPending) return <SkeletonCard lines={3} />;
    if (query.isError)
      return <ErrorState message={t('progress.photosFailed')} onRetry={() => query.refetch()} />;
    if (!photos.length)
      return (
        <EmptyState
          emoji="📸"
          title={t('progress.photosEmpty')}
          message={t('progress.photosEmptyDesc')}
        />
      );
    return (
      <View className="flex-row flex-wrap gap-2">
        {[...photos].reverse().map((p) => {
          const date = formatShortDate(new Date(p.takenAt));
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={t('progress.photoOpen', { date })}
              onPress={() => (remove.reset(), setOpen(p))}
              style={{ width: '31.5%' }}
              className="overflow-hidden rounded-xl bg-muted active:opacity-80"
            >
              {p.url ? (
                <Image source={{ uri: p.url }} style={{ width: '100%', aspectRatio: 3 / 4 }} />
              ) : (
                <View className="aspect-[3/4]" />
              )}
              <Text variant="caption" className="px-2 py-1 font-semibold">
                {date}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View className="mb-4 gap-3">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        📸 {t('progress.photosTitle')}
      </Text>
      <Callout emoji="🔒" tone="info">
        {t('progress.photosPrivacy')}
      </Callout>
      {body()}
      {add.isPending ? (
        <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
          {t('progress.photosUploading')}
        </Text>
      ) : null}
      <FormMessage
        message={notice ?? (add.isError ? t('progress.photosUploadFailed') : undefined)}
      />
      <View className="gap-2">
        <Button
          label={t('progress.photosTake')}
          disabled={add.isPending}
          onPress={() => start('camera')}
        />
        <Button
          label={t('progress.photosChoose')}
          variant="outline"
          disabled={add.isPending}
          onPress={() => start('library')}
        />
      </View>

      <View className="mt-2 gap-3 rounded-2xl border border-border bg-card p-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          {t('progress.compareTitle')}
        </Text>
        {!premium ? (
          <>
            <Text tone="muted" className="text-[13px]">
              ⭐ {t('progress.compareLocked')}
            </Text>
            <Button label={t('progress.compareUpgrade')} onPress={() => router.push('/paywall')} />
          </>
        ) : photos.length < 2 ? (
          <Text tone="muted" className="text-[13px]">
            {t('progress.compareNeedTwo')}
          </Text>
        ) : (
          <PhotoCompare photos={photos} metrics={metrics} units={units} />
        )}
      </View>

      {open ? (
        <PhotoViewer
          photo={open}
          weightKg={weightNear(metrics, open.takenAt)}
          units={units}
          deleting={remove.isPending}
          deleteFailed={remove.isError}
          onClose={() => setOpen(null)}
          onDelete={() => remove.mutate(open, { onSuccess: () => setOpen(null) })}
        />
      ) : null}
    </View>
  );
}
