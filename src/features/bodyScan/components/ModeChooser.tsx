import { Pressable, View } from 'react-native';

import { Card, SelectCard, Text } from '@/components';
import { t } from '@/i18n';

/**
 * Manual entry is the free default. The AI camera scan is Premium (CLAUDE.md §7.3): Premium users
 * can start it; others see what it is and where to find it once they upgrade.
 */
export function ModeChooser({
  premium,
  onManual,
  onAi,
}: {
  premium: boolean;
  onManual: () => void;
  onAi: () => void;
}) {
  return (
    <View className="gap-4">
      <Text tone="muted" className="text-sm leading-6">
        {t('bodyScan.intro')}
      </Text>
      <Pressable
        accessibilityRole="button"
        aria-disabled={!premium}
        disabled={!premium}
        onPress={onAi}
        accessibilityLabel={`${t('bodyScan.aiTitle')}, ${t('bodyScan.premium')}${premium ? '' : `, ${t('bodyScan.premiumOnly')}`}`}
        className={`rounded-3xl border-[1.5px] border-primary/30 p-5 ${premium ? 'active:opacity-80' : 'opacity-80'}`}
        style={{ backgroundColor: '#1A1A2E' }}
      >
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Text className="text-3xl leading-10">📷</Text>
        </View>
        <Text variant="heading" className="font-extrabold" style={{ color: '#F1F5F9' }}>
          {t('bodyScan.aiTitle')}
        </Text>
        <Text variant="caption" className="mt-1 text-[13px] leading-5" style={{ color: '#94A3B8' }}>
          {t('bodyScan.aiDesc')}
        </Text>
        <View className="mt-3 flex-row gap-2">
          <View className="rounded-full bg-primary/20 px-2.5 py-1">
            <Text variant="caption" tone="primary" className="font-bold">
              {t('bodyScan.premium')}
            </Text>
          </View>
        </View>
        <Text variant="caption" className="mt-3 font-bold text-[13px]" style={{ color: '#FCD34D' }}>
          {premium ? `${t('bodyScan.aiStart')} →` : t('bodyScan.premiumOnly')}
        </Text>
      </Pressable>
      <SelectCard
        emoji="📏"
        title={t('bodyScan.manualTitle')}
        description={t('bodyScan.manualDesc')}
        trailing={t('bodyScan.mostAccurate')}
        selectionRole="radio"
        selected={false}
        onPress={onManual}
      />
      <Card tone="muted" className="shadow-none">
        <Text variant="caption" tone="muted">
          {t('common.notMedicalAdvice')}
        </Text>
      </Card>
    </View>
  );
}
