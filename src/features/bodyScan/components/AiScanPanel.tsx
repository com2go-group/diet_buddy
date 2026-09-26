import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Callout, Card, SkeletonCard, Text } from '@/components';
import { t, type StringKey } from '@/i18n';
import { pickPhoto } from '@/lib/images';

import { FormMessage } from '../../auth/components/FormMessage';
import { useSessionStore } from '../../auth/sessionStore';
import {
  analyzeBodyScan,
  BodyScanError,
  hasBodyPhotoConsent,
  setBodyPhotoConsent,
  type Measurements,
} from '../aiScan';

type Which = 'front' | 'side';

/**
 * AI body scan: separate consent on first use, then a front and a side photo (neck down),
 * sent once for an estimate of waist, hips and neck. Photos stay in memory only.
 */
export function AiScanPanel({ onMeasured }: { onMeasured: (m: Measurements) => void }) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const consent = useQuery({
    queryKey: ['bodyPhotoConsent', userId],
    enabled: Boolean(userId),
    queryFn: () => hasBodyPhotoConsent(userId!),
  });
  const [agreed, setAgreed] = useState(false);
  const grant = useMutation({
    mutationFn: () => setBodyPhotoConsent(true),
    onSuccess: () => queryClient.setQueryData(['bodyPhotoConsent', userId], true),
  });
  const [photos, setPhotos] = useState<Record<Which, string | null>>({ front: null, side: null });
  const [notice, setNotice] = useState<string | null>(null);
  const scan = useMutation({
    mutationFn: () => analyzeBodyScan(photos.front!, photos.side!),
    onSuccess: onMeasured,
  });

  const take = async (which: Which, source: 'camera' | 'library') => {
    setNotice(null);
    scan.reset();
    const picked = await pickPhoto(source, 0.6).catch(() => ({ kind: 'cancelled' as const }));
    if (picked.kind === 'photo') setPhotos((p) => ({ ...p, [which]: picked.base64 }));
    else if (picked.kind !== 'cancelled') {
      setNotice(
        t(picked.kind === 'denied' ? 'restaurant.denied' : 'bodyScan.aiError_invalid_image'),
      );
    }
  };

  if (consent.isPending) return <SkeletonCard lines={3} />;

  if (!consent.data) {
    return (
      <Card className="gap-3">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          🔒 {t('bodyScan.aiConsentTitle')}
        </Text>
        <Text tone="muted" className="text-[14px] leading-5">
          {t('bodyScan.aiConsentBody')}
        </Text>
        <Pressable
          accessibilityRole="checkbox"
          aria-checked={agreed}
          onPress={() => setAgreed(!agreed)}
          style={{ minHeight: 44 }}
          className="flex-row items-center gap-3"
        >
          <View
            className={
              agreed
                ? 'h-6 w-6 items-center justify-center rounded-md bg-primary-text'
                : 'h-6 w-6 rounded-md border-2 border-border bg-muted'
            }
          >
            {agreed ? <Text className="font-bold text-[13px] text-background">✓</Text> : null}
          </View>
          <Text className="flex-1 text-[14px]">{t('bodyScan.aiConsentAgree')}</Text>
        </Pressable>
        <Text variant="caption" tone="muted">
          {t('bodyScan.aiConsentWithdraw')}
        </Text>
        <FormMessage message={grant.isError ? t('bodyScan.aiError_failed') : undefined} />
        <Button
          label={t('bodyScan.aiConsentButton')}
          disabled={!agreed}
          loading={grant.isPending}
          onPress={() => grant.mutate()}
        />
      </Card>
    );
  }

  if (scan.isPending) {
    return (
      <View className="gap-3" aria-busy>
        <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
          {t('bodyScan.aiAnalysing')}
        </Text>
        <SkeletonCard lines={4} />
      </View>
    );
  }

  const code = scan.error instanceof BodyScanError ? scan.error.code : 'failed';
  return (
    <View className="gap-4">
      <Callout emoji="📸" tone="info">
        <Text variant="label" className="font-bold">
          {t('bodyScan.aiHowTitle')}
        </Text>
        <Text className="text-[13px]">• {t('bodyScan.aiHow1')}</Text>
        <Text className="text-[13px]">• {t('bodyScan.aiHow2')}</Text>
        <Text className="text-[13px]">• {t('bodyScan.aiHow3')}</Text>
      </Callout>
      {(['front', 'side'] as const).map((which) => {
        const name = t(which === 'front' ? 'bodyScan.aiFront' : 'bodyScan.aiSide');
        return (
          <Card key={which} className="gap-2">
            <Text variant="label" className="font-bold">
              {photos[which] ? t('bodyScan.aiTaken', { which: name }) : name}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  size="md"
                  variant={photos[which] ? 'outline' : 'primary'}
                  label={t(photos[which] ? 'bodyScan.aiRetake' : 'bodyScan.aiTake', {
                    which: name.toLowerCase(),
                  })}
                  onPress={() => take(which, 'camera')}
                />
              </View>
              <View className="flex-1">
                <Button
                  size="md"
                  variant="ghost"
                  label={t('bodyScan.aiChoose', { which: name.toLowerCase() })}
                  onPress={() => take(which, 'library')}
                />
              </View>
            </View>
          </Card>
        );
      })}
      <FormMessage
        message={notice ?? (scan.isError ? t(`bodyScan.aiError_${code}` as StringKey) : undefined)}
      />
      <Button
        label={t('bodyScan.aiAnalyse')}
        disabled={!photos.front || !photos.side}
        onPress={() => scan.mutate()}
      />
    </View>
  );
}
