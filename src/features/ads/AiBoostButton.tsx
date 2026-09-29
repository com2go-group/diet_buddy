import { useState } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { adsSupported, type RewardOutcome } from '@/lib/ads';
import type { AiBoost } from '@/lib/ai/headers';

import { useRewardedBoost } from './useAds';

/**
 * "Watch a short video for more": an opt-in rewarded video that adds AI use for today (§12:
 * the user taps to watch; the reward counts only after Google's server callback). Hidden on the
 * web build, which has no ads, and when the server offers no video.
 */
export function AiBoostButton({
  boost,
  onEarned,
}: {
  boost: AiBoost | null;
  onEarned: () => void;
}) {
  const watch = useRewardedBoost();
  const [watching, setWatching] = useState(false);
  const [outcome, setOutcome] = useState<RewardOutcome | null>(null);
  if (!adsSupported || !boost) return null;

  const onPress = async () => {
    setWatching(true);
    setOutcome(null);
    const result = await watch(boost.target).finally(() => setWatching(false));
    setOutcome(result);
    if (result === 'earned') onEarned();
  };

  return (
    <View className="gap-1">
      <Button
        label={
          watching
            ? t('ads.loading')
            : boost.adds
              ? t('aiBoost.watch', { count: boost.adds })
              : t('aiBoost.watchBudget')
        }
        variant="outline"
        size="md"
        loading={watching}
        onPress={onPress}
      />
      {outcome && outcome !== 'earned' ? (
        <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
          {outcome === 'dismissed' ? t('aiBoost.notEarned') : t('aiBoost.unavailable')}
        </Text>
      ) : null}
    </View>
  );
}
