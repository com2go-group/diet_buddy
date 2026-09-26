import { View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';

const POINTS = [
  'wellness.consentPoint1',
  'wellness.consentPoint2',
  'wellness.consentPoint3',
] as const;

/** Asks for the separate coach-insights consent before any chat is analysed (GDPR Art. 9). */
export function ConsentCard({
  saving,
  failed,
  onAgree,
}: {
  saving: boolean;
  failed: boolean;
  onAgree: () => void;
}) {
  return (
    <Card className="gap-3">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        🔒 {t('wellness.consentTitle')}
      </Text>
      <Text tone="muted" className="text-[14px] leading-5">
        {t('wellness.consentBody')}
      </Text>
      <View className="gap-1.5">
        {POINTS.map((key) => (
          <Text key={key} className="text-[14px] leading-5">
            • {t(key)}
          </Text>
        ))}
      </View>
      <FormMessage message={failed ? t('wellness.consentFailed') : undefined} />
      <Button label={t('wellness.consentButton')} loading={saving} onPress={onAgree} />
    </Card>
  );
}
