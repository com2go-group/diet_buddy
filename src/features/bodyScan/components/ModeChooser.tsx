import { View } from 'react-native';

import { Card, SelectCard, Text } from '@/components';
import { t } from '@/i18n';

/**
 * Manual entry is the free default. The AI camera scan is Premium and deferred
 * (CLAUDE.md §17 decision 1), so it is shown as coming soon rather than faked.
 */
export function ModeChooser({ onManual }: { onManual: () => void }) {
  return (
    <View className="gap-4">
      <Text tone="muted" className="text-sm leading-6">
        {t('bodyScan.intro')}
      </Text>
      <View
        accessible
        aria-disabled
        accessibilityLabel={`${t('bodyScan.aiTitle')}, ${t('bodyScan.premium')}, ${t('bodyScan.comingSoon')}`}
        className="rounded-3xl border-[1.5px] border-primary/30 p-5 opacity-70"
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
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Text variant="caption" className="font-bold" style={{ color: '#CBD5E1' }}>
              {t('bodyScan.comingSoon')}
            </Text>
          </View>
        </View>
      </View>
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
