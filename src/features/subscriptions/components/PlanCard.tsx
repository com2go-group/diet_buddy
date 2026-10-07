import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import type { PlanOption } from '@/lib/purchases';
import { accentColor, useTheme } from '@/theme';

export function PlanCard({
  plan,
  selected,
  onPress,
}: {
  plan: PlanOption;
  selected: boolean;
  onPress: () => void;
}) {
  const { scheme } = useTheme();
  const badge =
    plan.trialDays !== null
      ? t('paywall.trialBadge', { days: plan.trialDays })
      : plan.savingPct !== null
        ? t('paywall.saveBadge', { pct: plan.savingPct })
        : null;
  // The billed amount is the most prominent price (App Store guideline 3.1.2(c)); a monthly
  // equivalent and the badges stay smaller.
  const main = plan.price;
  const suffix = t(plan.kind === 'annual' ? 'paywall.perYearSuffix' : 'paywall.perMonthSuffix');
  const sub =
    plan.kind === 'annual' && plan.perMonth
      ? t('paywall.perMonthEquivalent', { price: plan.perMonth })
      : null;
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={[t(`paywall.${plan.kind}`), `${main}${suffix}`, sub, badge]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-2xl border-[1.5px] p-4 active:opacity-80 ${selected ? 'border-primary bg-accent' : 'border-border bg-card'}`}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-border'}`}
        >
          {selected ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
        </View>
        <View>
          <Text variant="label" className="font-bold text-[15px]">
            {t(`paywall.${plan.kind}`)}
          </Text>
          {sub ? (
            <Text variant="caption" tone="muted">
              {sub}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="items-end gap-1">
        {badge ? (
          <View className="rounded-full bg-success/15 px-2 py-0.5">
            <Text
              variant="caption"
              className="font-extrabold text-[11px]"
              style={{ color: accentColor('green', scheme) }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
        <Text className="font-extrabold text-xl">
          {main}
          <Text variant="caption" tone="muted">
            {suffix}
          </Text>
        </Text>
      </View>
    </Pressable>
  );
}
