import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';

import { defaultLook, fullness, twinFrames } from '../twin';
import { useTwin } from '../useTwin';
import { TwinAvatar } from './TwinAvatar';

/** Progress → Body entry to the Digital Twin, showing the twin as it is now. */
export function TwinCard() {
  const { query } = useTwin();
  const [now] = useState(() => new Date());
  const data = query.data;
  const look = data?.look ?? defaultLook(null);
  const current = useMemo(() => {
    if (!data?.heightCm) return null;
    return twinFrames({ ...data, heightCm: data.heightCm, now }).find((f) => f.kind === 'now');
  }, [data, now]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('progress.twinTitle')}. ${t('progress.twinDesc')}`}
      accessibilityHint={t('progress.twinOpen')}
      onPress={() => router.push('/twin')}
      className="mb-4 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80"
    >
      <TwinAvatar
        look={look}
        fullness={current ? fullness(current.bodyFatPct, look.variant) : 0.4}
        height={84}
      />
      <View className="flex-1 gap-0.5">
        <Text className="font-bold">{t('progress.twinTitle')}</Text>
        <Text tone="muted" className="text-[13px] leading-5">
          {t('progress.twinDesc')}
        </Text>
        <Text className="font-semibold text-[13px] text-primary-text">
          {t('progress.twinOpen')} →
        </Text>
      </View>
    </Pressable>
  );
}
