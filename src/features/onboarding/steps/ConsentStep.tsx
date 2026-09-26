import { Linking, View } from 'react-native';

import { Callout, SelectCard, Text } from '@/components';
import { t } from '@/i18n';

import { authConfig } from '../../auth/config';
import { FieldError, StepHeader, type StepProps } from './shared';

const POINTS = [
  { emoji: '🎯', key: 'consent.pointPurpose' },
  { emoji: '🚫', key: 'consent.pointAds' },
  { emoji: '🔒', key: 'consent.pointStorage' },
  { emoji: '🗂️', key: 'consent.pointControl' },
] as const;

/** Explicit, separate consent for special-category health data (GDPR, CLAUDE.md §13). */
export function ConsentStep({ draft, update, errors }: StepProps) {
  return (
    <>
      <StepHeader emoji="🛡️" title={t('consent.title')} subtitle={t('consent.subtitle')} />
      <View className="gap-4">
        <Text className="text-[15px] leading-6">{t('consent.intro')}</Text>
        <View className="gap-2.5">
          {POINTS.map((point) => (
            <View key={point.key} className="flex-row gap-3">
              <Text accessibilityElementsHidden importantForAccessibility="no">
                {point.emoji}
              </Text>
              <Text tone="muted" className="flex-1 text-sm">
                {t(point.key)}
              </Text>
            </View>
          ))}
        </View>
        <SelectCard
          title={t('consent.agree')}
          description={t('consent.agreeHint')}
          selected={draft.healthConsent}
          onPress={() => update({ healthConsent: !draft.healthConsent })}
        />
        <FieldError error={errors.consent} />
        <Text variant="label" className="mt-2 font-bold">
          {t('consent.optionalTitle')}
        </Text>
        <SelectCard
          title={t('consent.coachInsights')}
          description={t('consent.coachInsightsHint')}
          selected={draft.coachInsightsConsent}
          onPress={() => update({ coachInsightsConsent: !draft.coachInsightsConsent })}
        />
        {authConfig.privacyUrl ? (
          <Text
            variant="label"
            tone="primary"
            accessibilityRole="link"
            onPress={() => Linking.openURL(authConfig.privacyUrl!)}
          >
            {t('consent.privacyLink')}
          </Text>
        ) : null}
        <Callout emoji="ℹ️" tone="info">
          {t('common.notMedicalAdvice')}
        </Callout>
      </View>
    </>
  );
}
