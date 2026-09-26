import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Callout, Card, EmptyState, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatLongDate, formatWeight } from '@/lib/format';
import { parseDayKey } from '@/lib/dates';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { usePremium } from '../subscriptions/usePremium';
import { LookSheet } from './components/LookSheet';
import { frameDate, frameName, TimelineStrip } from './components/TimelineStrip';
import { TwinAvatar } from './components/TwinAvatar';
import { frameBmi, fullness, twinFrames, type TwinFrame } from './twin';
import { useTwin } from './useTwin';

const close = () => (router.canGoBack() ? router.back() : router.replace('/progress'));

/** Digital Twin: a cartoon of the user drawn from their measurements, over time and at the goal. */
export function TwinScreen() {
  const { colors } = useTheme();
  const { premium } = usePremium();
  const { query, look } = useTwin();
  const [now] = useState(() => new Date());
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [opened, setOpened] = useState(0);
  const data = query.data;
  const frames = useMemo(
    () =>
      data?.heightCm ? twinFrames({ ...data, heightCm: data.heightCm, sex: data.sex, now }) : [],
    [data, now],
  );
  const isLocked = (frame: TwinFrame) => !premium && frame.kind !== 'now';
  const nowIndex = Math.max(
    0,
    frames.findIndex((f) => f.kind === 'now'),
  );
  const selected = picked !== null && picked < frames.length ? picked : nowIndex;

  const body = () => {
    if (query.isPending) return <SkeletonCard lines={6} />;
    if (query.isError || !data) return <ErrorState onRetry={() => query.refetch()} />;
    if (!data.heightCm || !frames.length) {
      return (
        <EmptyState
          emoji="🧍"
          title={t('twin.emptyTitle')}
          message={data.heightCm ? t('twin.emptyDesc') : t('twin.noHeight')}
          actionLabel={t('twin.emptyAction')}
          onAction={() => router.push('/body-check')}
        />
      );
    }
    const frame = frames[selected]!;
    const locked = isLocked(frame);
    const start = frames[0]!;
    const weight = formatWeight(frame.weightKg, data.units);
    const fat = formatDecimal(frame.bodyFatPct);
    const details = t(frame.estimatedFat ? 'twin.detailsEstimated' : 'twin.details', {
      weight,
      fat,
    });
    const change = frame.weightKg - start.weightKg;
    const goalDay = parseDayKey(frame.date);
    return (
      <View className="gap-4">
        <Text tone="muted">{t('twin.intro')}</Text>
        <Card className="items-center gap-2">
          <Animated.View key={selected} entering={FadeIn.duration(300)}>
            <TwinAvatar
              look={data.look}
              fullness={fullness(frame.bodyFatPct, data.look.variant)}
              height={260}
              muted={locked}
              accessibilityLabel={t('twin.a11y', {
                frame: frameName(frame),
                details: locked ? '🔒' : details,
              })}
            />
          </Animated.View>
          <Text variant="heading" accessibilityRole="header">
            {frameName(frame)}
            {frame.kind !== 'goal' ? ` · ${frameDate(frame)}` : ''}
          </Text>
          {locked ? (
            <View className="w-full gap-3">
              <Callout emoji="⭐">{t('twin.locked')}</Callout>
              <Button label={t('twin.upgrade')} onPress={() => router.push('/paywall')} />
            </View>
          ) : (
            <View className="items-center gap-1">
              <Text className="text-center font-semibold">{details}</Text>
              <Text tone="muted" className="text-[13px]">
                {t('twin.bmi', { bmi: formatDecimal(frameBmi(frame, data.heightCm)) })}
              </Text>
              {frame.kind === 'goal' ? (
                <Text tone="muted" className="text-center text-[13px]">
                  {goalDay
                    ? t('twin.goalDate', { date: formatLongDate(goalDay) })
                    : t('twin.goalNoDate')}
                </Text>
              ) : frame !== start && start.kind === 'start' && Math.abs(change) >= 0.05 ? (
                <Text tone="muted" className="text-[13px]">
                  {t('twin.change', {
                    change: `${change > 0 ? '+' : '−'}${formatWeight(Math.abs(change), data.units)}`,
                  })}
                </Text>
              ) : null}
            </View>
          )}
        </Card>
        {frames.length > 1 ? (
          <View className="gap-2">
            <Text variant="heading" accessibilityRole="header" className="text-base">
              {t('twin.timeline')}
            </Text>
            <TimelineStrip
              frames={frames}
              look={data.look}
              selected={selected}
              isLocked={isLocked}
              onSelect={setPicked}
            />
          </View>
        ) : null}
        <Button
          label={t('twin.customise')}
          variant="outline"
          onPress={() => (setOpened((n) => n + 1), setEditing(true))}
        />
        <Text variant="caption" tone="muted" className="text-center">
          {t('twin.note')}
        </Text>
        <LookSheet
          key={opened}
          visible={editing}
          look={data.look}
          bodyFatPct={frames[nowIndex]!.bodyFatPct}
          saving={look.isPending}
          failed={look.isError}
          onSave={(next) => look.mutate(next, { onSuccess: () => setEditing(false) })}
          onClose={() => (setEditing(false), look.reset())}
        />
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
        <View style={{ width: MIN_TOUCH_TARGET }} />
        <Text variant="heading" accessibilityRole="header">
          🧍 {t('twin.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('twin.close')}
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
