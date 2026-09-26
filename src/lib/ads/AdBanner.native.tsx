import { useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { Text } from '@/components';

import { requestOptions, unitId } from './config';

/** Anchored adaptive banner with an "Ad" label; collapses if nothing loads. */
export function AdBanner({ personalised, label }: { personalised: boolean; label: string }) {
  const [failed, setFailed] = useState(false);
  const id = unitId('banner');
  if (!id || failed) return null;
  return (
    <View className="my-3 items-center gap-1" accessibilityLabel={label}>
      <Text variant="caption" tone="muted" className="text-[10px] uppercase tracking-wider">
        {label}
      </Text>
      <BannerAd
        unitId={id}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={requestOptions(personalised)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
