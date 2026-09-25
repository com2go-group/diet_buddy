import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET } from '@/theme';

import type { StepError } from '../draft';
import type { OnboardingController } from '../useOnboarding';

export type StepProps = Pick<OnboardingController, 'draft' | 'update' | 'errors' | 'formatWeight'>;

export function errorText(error: StepError | undefined): string | undefined {
  return error ? t(error.key, error.params) : undefined;
}

export function StepHeader({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="pb-5 pt-4">
      <Text
        className="mb-3 text-4xl leading-[44px]"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {emoji}
      </Text>
      <Text variant="title" accessibilityRole="header" className="tracking-tight">
        {title}
      </Text>
      <Text tone="muted" className="mt-1 text-sm">
        {subtitle}
      </Text>
    </View>
  );
}

/** "3 selected · Clear all" row above multi-select lists. */
export function SelectionSummary({
  count,
  emptyLabel,
  onClear,
}: {
  count: number;
  emptyLabel: string;
  onClear: () => void;
}) {
  return (
    <View className="mb-1 min-h-11 flex-row items-center justify-between">
      <Text variant="caption" tone="muted" className="text-[13px]">
        {count === 0 ? emptyLabel : t('onboarding.selectedCount', { count })}
      </Text>
      {count > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
          className="items-end justify-center active:opacity-70"
        >
          <Text variant="caption" tone="muted" className="font-semibold">
            {t('onboarding.clearAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FieldError({ error }: { error: StepError | undefined }) {
  if (!error) return null;
  return (
    <Text variant="caption" tone="destructive" className="mt-2" accessibilityLiveRegion="polite">
      {errorText(error)}
    </Text>
  );
}
