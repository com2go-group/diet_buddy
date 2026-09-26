import { Feather } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import type Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Callout,
  EmptyState,
  ErrorState,
  SkeletonCard,
  SwitchRow,
  Text,
} from '@/components';
import { t } from '@/i18n';
import { formatShortDate } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { usePremium } from '../subscriptions/usePremium';
import { fullness, twinFrames } from '../twin/twin';
import { StoryCard, storyBadgeText, storyWeightText } from './components/StoryCard';
import { shareStoryImage } from './shareImage';
import { weekStats } from './story';
import { useStory } from './useStory';

const close = () => (router.canGoBack() ? router.back() : router.replace('/progress'));

/** Weekly Progress Story: the last 7 days as a shareable image, made on the device. */
export function StoryScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { premium } = usePremium();
  const [now] = useState(() => new Date());
  const query = useStory(now);
  const [showTwin, setShowTwin] = useState(true);
  const [showWeight, setShowWeight] = useState(false);
  const svg = useRef<Svg>(null);
  const share = useMutation({ mutationFn: () => shareStoryImage(svg.current!, now) });

  const view = useMemo(() => {
    const data = query.data;
    if (!data) return null;
    const stats = weekStats(data.input);
    const { twin } = data;
    const current = twin.heightCm
      ? twinFrames({ ...twin, heightCm: twin.heightCm, now }).find((f) => f.kind === 'now')
      : undefined;
    return {
      stats,
      twin,
      twinFullness: current ? fullness(current.bodyFatPct, twin.look.variant) : null,
      empty: stats.daysLogged === 0 && stats.checkins === 0 && stats.avgScore === null,
    };
  }, [query.data, now]);

  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void, desc?: string) => (
    <SwitchRow label={label} description={desc} value={value} onChange={onChange} />
  );

  const body = () => {
    if (query.isPending) return <SkeletonCard lines={8} />;
    if (query.isError || !view) return <ErrorState onRetry={() => query.refetch()} />;
    const { stats, twin, twinFullness, empty } = view;
    if (empty) {
      return (
        <EmptyState
          emoji="📸"
          title={t('story.emptyTitle')}
          message={t('story.emptyDesc')}
          actionLabel={t('story.emptyAction')}
          onAction={() => router.push('/log-food')}
        />
      );
    }
    const cardWidth = Math.min(width - 40, 340);
    const noWeight = stats.weightChangeKg === null;
    const extra = [storyWeightText(stats, showWeight, twin.units), storyBadgeText(stats)].filter(
      (x): x is string => x !== null,
    );
    return (
      <View className="gap-4">
        <Text tone="muted">{t('story.intro')}</Text>
        <View
          className="items-center"
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('story.a11y', {
            range: `${formatShortDate(stats.start)} – ${formatShortDate(stats.end)}`,
            streak: stats.streakDays,
            logged: stats.daysLogged,
            onTarget: stats.daysOnTarget,
            water: stats.waterDays,
            checkins: stats.checkins,
            extra: extra.map((x) => ` ${x}`).join(''),
          })}
        >
          <View className="overflow-hidden rounded-2xl border border-border">
            <StoryCard
              ref={svg}
              stats={stats}
              look={twin.look}
              fullness={showTwin ? twinFullness : null}
              showWeight={showWeight}
              units={twin.units}
              width={cardWidth}
            />
          </View>
        </View>
        {twinFullness !== null ? toggle(t('story.showTwin'), showTwin, setShowTwin) : null}
        {toggle(
          t('story.showWeight'),
          showWeight,
          setShowWeight,
          noWeight ? t('story.noWeight') : t('story.showWeightDesc'),
        )}
        {premium ? (
          <View className="gap-2">
            <FormMessage
              tone={share.data === 'downloaded' ? 'info' : 'error'}
              message={
                share.isError
                  ? t('story.shareFailed')
                  : share.data === 'downloaded'
                    ? t('story.downloaded')
                    : undefined
              }
            />
            <Button
              label={t('story.share')}
              loading={share.isPending}
              onPress={() => share.mutate()}
            />
          </View>
        ) : (
          <View className="gap-3">
            <Callout emoji="⭐">{t('story.locked')}</Callout>
            <Button label={t('story.upgrade')} onPress={() => router.push('/paywall')} />
          </View>
        )}
        <Text variant="caption" tone="muted" className="text-center">
          {t('story.privacy')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
        <View style={{ width: MIN_TOUCH_TARGET }} />
        <Text variant="heading" accessibilityRole="header">
          📸 {t('story.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('story.close')}
          onPress={close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">{body()}</ScrollView>
    </SafeAreaView>
  );
}
