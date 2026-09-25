import { View } from 'react-native';

import { Callout } from '@/components';
import { t } from '@/i18n';
import type { Plan } from '@/lib/nutrition';

/** Safety messages from computePlan (CLAUDE.md §9), worded for the user. */
export function PlanWarnings({
  plan,
  formatWeight,
  className,
}: {
  plan: Plan;
  formatWeight: (kg: number, decimals?: number) => string;
  className?: string;
}) {
  if (plan.warnings.length === 0) return null;
  const params = {
    rate: formatWeight(Math.abs(plan.weeklyChangeKg), 2),
    kcal: plan.calorieFloor.toLocaleString('en-GB'),
  };
  return (
    <View className={className} accessibilityLiveRegion="polite">
      <View className="gap-2">
        {plan.warnings.map((w) => (
          <Callout
            key={w.code}
            emoji={w.code === 'underweight_current' ? '🩺' : '⚠️'}
            tone="danger"
          >
            {t(`planWarnings.${w.code}`, params)}
          </Callout>
        ))}
      </View>
    </View>
  );
}
