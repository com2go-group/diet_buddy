import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';

/**
 * What the user can do with the current meal's suggestion: eat it, ask for another idea, log
 * their own meal instead, or skip it. Any of these moves the plan on to the next meal.
 */
export function MealActions({
  title,
  hint,
  logging,
  asking,
  skipping,
  onAte,
  onAnother,
  onOwn,
  onSkip,
}: {
  title: string;
  hint: string;
  logging: boolean;
  asking: boolean;
  skipping: boolean;
  onAte: () => void;
  onAnother: () => void;
  onOwn: () => void;
  onSkip: () => void;
}) {
  const busy = logging || asking || skipping;
  return (
    <View className="mt-1 gap-2">
      <Button
        label={t('mealPlan.ateThis')}
        accessibilityLabel={t('mealPlan.ateItem', { name: title })}
        loading={logging}
        disabled={busy}
        onPress={onAte}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label={asking ? t('mealPlan.anotherLoading') : t('mealPlan.anotherIdea')}
            variant="outline"
            size="md"
            loading={asking}
            disabled={busy}
            onPress={onAnother}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t('mealPlan.ateOther')}
            variant="outline"
            size="md"
            disabled={busy}
            onPress={onOwn}
          />
        </View>
      </View>
      <Button
        label={t('mealPlan.skip')}
        variant="ghost"
        size="md"
        loading={skipping}
        disabled={busy}
        onPress={onSkip}
      />
      <Text variant="caption" tone="muted" className="text-[13px]">
        {hint}
      </Text>
    </View>
  );
}
