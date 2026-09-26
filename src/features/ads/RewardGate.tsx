import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, GradientFill, Text } from '@/components';
import { t } from '@/i18n';

import { useRewardedUnlock } from './useAds';

/**
 * Opt-in rewarded video before content (prototype RewardAdScreen). The content is shown whatever
 * happens: watched, skipped, or no ad available (§12).
 */
export function RewardGate({
  title,
  description,
  xp,
  type,
  target,
  onDone,
}: {
  title: string;
  description: string;
  xp: number;
  type: 'meal_plan' | 'ai_plan';
  target: string;
  onDone: () => void;
}) {
  const unlock = useRewardedUnlock();
  const [state, setState] = useState<'idle' | 'loading' | 'earned' | 'failed'>('idle');

  const watch = async () => {
    setState('loading');
    const outcome = await unlock(type, target);
    if (outcome === 'earned') {
      setState('earned');
      setTimeout(onDone, 1200);
    } else if (outcome === 'failed') {
      setState('failed');
      setTimeout(onDone, 1500);
    } else {
      onDone();
    }
  };

  return (
    <SafeAreaView
      className="flex-1 justify-center gap-6 px-6"
      style={{ backgroundColor: '#0F172A' }}
    >
      <View className="items-center gap-3">
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-3xl">
          <GradientFill id="rewardGate" />
          <Text className="text-4xl leading-[48px]">🎁</Text>
        </View>
        <Text
          accessibilityRole="header"
          className="text-center font-extrabold text-2xl"
          style={{ color: '#F1F5F9' }}
        >
          {title}
        </Text>
        <Text className="text-center text-[15px] leading-6" style={{ color: '#94A3B8' }}>
          {description}
        </Text>
      </View>
      <Text
        accessibilityLiveRegion="polite"
        className="text-center font-bold"
        style={{ color: '#F59E0B' }}
      >
        {state === 'earned'
          ? t('ads.earned', { xp })
          : state === 'failed'
            ? t('ads.notAvailable')
            : state === 'loading'
              ? t('ads.loading')
              : ' '}
      </Text>
      <View className="gap-2">
        <Button
          label={t('ads.watch', { xp })}
          loading={state === 'loading'}
          disabled={state !== 'idle'}
          onPress={watch}
        />
        <Button
          label={t('ads.skip')}
          variant="ghost"
          disabled={state === 'loading'}
          onPress={onDone}
        />
      </View>
    </SafeAreaView>
  );
}
