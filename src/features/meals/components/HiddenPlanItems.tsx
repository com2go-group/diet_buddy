import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { adsSupported } from '@/lib/ads';

/**
 * Free plan: the rest of a meal is hidden until the user chooses to watch a rewarded video for
 * that meal (+15 XP, verified by the server) or has Premium (CLAUDE.md §12).
 */
export function HiddenPlanItems({
  count,
  watching,
  onWatch,
}: {
  count: number;
  watching: boolean;
  onWatch: () => void;
}) {
  return (
    <View className="gap-2">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-muted p-3 opacity-70"
        >
          <Text>🔒</Text>
          <View className="h-3 flex-1 rounded-full bg-border" />
        </View>
      ))}
      <View className="gap-2 rounded-2xl border-[1.5px] border-primary/35 bg-primary/10 p-3.5">
        <Text variant="label" className="font-bold" accessibilityLiveRegion="polite">
          {t('mealPlan.hidden', { count })}
        </Text>
        {adsSupported ? (
          <Button
            label={watching ? t('mealPlan.watching') : t('mealPlan.watch')}
            loading={watching}
            size="md"
            onPress={onWatch}
          />
        ) : null}
        <Button
          label={t('mealPlan.unlockPremium')}
          variant={adsSupported ? 'ghost' : 'primary'}
          size="md"
          onPress={() => router.push('/paywall')}
        />
      </View>
    </View>
  );
}
