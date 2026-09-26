import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Callout, EmptyState, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { pickPhoto } from '@/lib/images';

import { FormMessage } from '../../auth/components/FormMessage';
import { FoodPhotoError } from '../api';
import { PHOTO_GRAMS, photoItemMacros } from '../photo';
import { photoWarningText } from '../photoWarnings';
import type { FoodPhotoResult, Macros, PhotoItem } from '../types';
import { usePhotoScan } from '../useMeals';
import { PhotoItemRow, type PhotoChoice } from './PhotoItemRow';

export interface PhotoEntry {
  item: PhotoItem;
  grams: number;
  macros: Macros;
}

const ERROR_TEXT = {
  not_configured: 'foodPhoto.notConfigured',
  limit_reached: 'foodPhoto.limitReached',
  rate_limited: 'foodPhoto.rateLimited',
  invalid_image: 'foodPhoto.invalidImage',
  failed: 'foodPhoto.failed',
} as const;

function remainingText(remaining: number | null): string | null {
  if (remaining === null) return null;
  if (remaining === 0) return t('foodPhoto.remainingNone');
  if (remaining === 1) return t('foodPhoto.remainingOne');
  return t('foodPhoto.remaining', { count: remaining });
}

/**
 * Photo → recognised foods with USDA numbers → the user reviews, adjusts grams and logs.
 * Nothing is logged without the user's confirmation.
 */
export function PhotoPanel({
  slotLabel,
  saving,
  failed,
  onLog,
}: {
  slotLabel: string;
  saving: boolean;
  failed: boolean;
  onLog: (entries: PhotoEntry[]) => void;
}) {
  const scan = usePhotoScan();
  const [notice, setNotice] = useState<string | null>(null);
  const [choices, setChoices] = useState<PhotoChoice[]>([]);

  const start = async (source: 'camera' | 'library') => {
    setNotice(null);
    const picked = await pickPhoto(source).catch(() => ({ kind: 'cancelled' as const }));
    if (picked.kind === 'denied') return setNotice(t('foodPhoto.permissionDenied'));
    if (picked.kind === 'tooLarge') return setNotice(t('foodPhoto.tooLarge'));
    if (picked.kind === 'unsupported') return setNotice(t('foodPhoto.invalidImage'));
    if (picked.kind !== 'photo') return;
    scan.mutate(picked.base64, {
      onSuccess: (result: FoodPhotoResult) =>
        setChoices(result.items.map((i) => ({ included: i.food !== null, grams: i.grams }))),
    });
  };

  const pickers = (
    <View className="gap-2">
      <Button label={t('foodPhoto.takePhoto')} onPress={() => start('camera')} />
      <Button
        label={t('foodPhoto.choosePhoto')}
        variant="outline"
        onPress={() => start('library')}
      />
    </View>
  );

  if (scan.isPending) {
    return (
      <View className="gap-3" aria-busy>
        <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
          {t('foodPhoto.analysing')}
        </Text>
        <SkeletonCard lines={4} />
      </View>
    );
  }

  if (scan.isError) {
    const code = scan.error instanceof FoodPhotoError ? scan.error.code : 'failed';
    return (
      <View className="gap-4">
        {code === 'failed' ? (
          <ErrorState message={t(ERROR_TEXT.failed)} onRetry={() => scan.reset()} />
        ) : (
          <Callout emoji={code === 'limit_reached' ? '⭐' : '📷'} tone="info">
            {t(ERROR_TEXT[code])}
          </Callout>
        )}
        {code === 'limit_reached' ? (
          <Button label={t('foodPhoto.upgrade')} onPress={() => router.push('/paywall')} />
        ) : code !== 'failed' && code !== 'not_configured' ? (
          <Button label={t('foodPhoto.retake')} variant="outline" onPress={() => scan.reset()} />
        ) : null}
      </View>
    );
  }

  const result = scan.data;
  if (!result) {
    return (
      <View className="gap-4">
        <View className="gap-1">
          <Text variant="heading" accessibilityRole="header">
            📷 {t('foodPhoto.introTitle')}
          </Text>
          <Text tone="muted">{t('foodPhoto.intro')}</Text>
        </View>
        <Callout emoji="🔒" tone="info">
          {t('foodPhoto.privacy')}
        </Callout>
        <FormMessage message={notice ?? undefined} />
        {pickers}
      </View>
    );
  }

  const remaining = remainingText(result.remaining);
  const again = (
    <Button label={t('foodPhoto.retake')} variant="outline" onPress={() => scan.reset()} />
  );

  if (!result.items.length) {
    return (
      <View className="gap-4">
        <EmptyState
          emoji="🍽️"
          title={t('foodPhoto.nothingFound')}
          message={t('foodPhoto.nothingFoundDesc')}
        />
        {remaining ? (
          <Text variant="caption" tone="muted" className="text-center">
            {remaining}
          </Text>
        ) : null}
        {again}
      </View>
    );
  }

  const entries: PhotoEntry[] = [];
  let valid = true;
  result.items.forEach((item, i) => {
    const c = choices[i];
    if (!c?.included || !item.food) return;
    if (c.grams === null || c.grams < PHOTO_GRAMS[0] || c.grams > PHOTO_GRAMS[1]) {
      valid = false;
      return;
    }
    entries.push({ item, grams: c.grams, macros: photoItemMacros(item, c.grams)! });
  });
  const total = entries.reduce(
    (sum, e) => ({ kcal: sum.kcal + e.macros.kcal, proteinG: sum.proteinG + e.macros.proteinG }),
    { kcal: 0, proteinG: 0 },
  );

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {t('foodPhoto.resultsTitle')}
        </Text>
        <Text tone="muted" className="text-[13px]">
          {t('foodPhoto.resultsHint')}
        </Text>
      </View>
      {result.plateWarnings.map((w) => (
        <Callout key={w} emoji="⚠️" tone="danger">
          {photoWarningText(w)}
        </Callout>
      ))}
      {result.items.map((item, i) => (
        <PhotoItemRow
          key={`${item.name}-${i}`}
          item={item}
          choice={choices[i] ?? { included: false, grams: item.grams }}
          onChange={(c) => setChoices((all) => all.map((old, j) => (j === i ? c : old)))}
        />
      ))}
      <Text className="text-center font-semibold" accessibilityLiveRegion="polite">
        {t('foodPhoto.total', {
          kcal: formatNumber(total.kcal),
          protein: formatDecimal(total.proteinG),
        })}
      </Text>
      <Text variant="caption" tone="muted" className="text-center">
        {t('logFood.source')}
        {remaining ? ` · ${remaining}` : ''}
      </Text>
      <FormMessage message={failed ? t('logFood.saveFailed') : undefined} />
      <Button
        label={
          entries.length === 1
            ? t('foodPhoto.logOne', { slot: slotLabel })
            : t('foodPhoto.logSelected', { count: entries.length, slot: slotLabel })
        }
        disabled={!entries.length || !valid}
        loading={saving}
        onPress={() => onLog(entries)}
      />
      {again}
    </View>
  );
}
