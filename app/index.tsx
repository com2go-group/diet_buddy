/**
 * TEMPORARY: design-system preview used while Phase 1 is scaffolded.
 * Replaced by the auth/onboarding redirect in the Auth task (Phase 1, item 5).
 */
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  KpiTile,
  Ring,
  Screen,
  Sheet,
  SkeletonCard,
  Text,
} from '@/components';
import { t } from '@/i18n';
import { computePlan } from '@/lib/nutrition';
import { brand, useThemeStore, type ThemePreference } from '@/theme';

const samplePlan = computePlan({
  body: { sex: 'female', ageYears: 32, heightCm: 168, weightKg: 74 },
  activity: 'lightly_active',
  goals: ['lose_fat'],
  goalWeightKg: 66,
  pace: 'balanced',
});

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export default function DesignPreview() {
  const { preference, setPreference } = useThemeStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { macros } = samplePlan;

  return (
    <Screen contentClassName="gap-4 pt-4">
      <Text variant="title" accessibilityRole="header">
        {t('common.appName')} design system
      </Text>

      <View className="flex-row gap-2">
        {THEMES.map((mode) => (
          <Chip
            key={mode}
            label={mode}
            selectionRole="radio"
            selected={preference === mode}
            onPress={() => setPreference(mode)}
          />
        ))}
      </View>

      <Card className="items-center gap-4">
        <Ring
          value={1240}
          max={samplePlan.dailyCalories}
          size={160}
          strokeWidth={14}
          color={brand.gradient[0]}
          label={t('macros.calories')}
        >
          <Text variant="kpi">{samplePlan.dailyCalories - 1240}</Text>
          <Text variant="caption" tone="muted">
            kcal left
          </Text>
        </Ring>
        <View className="flex-row gap-4">
          <Ring
            value={70}
            max={macros.proteinG}
            size={72}
            strokeWidth={8}
            color={brand.protein}
            label={t('macros.protein')}
          >
            <Text variant="caption">{macros.pct.protein}%</Text>
          </Ring>
          <Ring
            value={120}
            max={macros.carbsG}
            size={72}
            strokeWidth={8}
            color={brand.carbs}
            label={t('macros.carbs')}
          >
            <Text variant="caption">{macros.pct.carbs}%</Text>
          </Ring>
          <Ring
            value={30}
            max={macros.fatG}
            size={72}
            strokeWidth={8}
            color={brand.fat}
            label={t('macros.fat')}
          >
            <Text variant="caption">{macros.pct.fat}%</Text>
          </Ring>
        </View>
      </Card>

      <View className="flex-row gap-3">
        <KpiTile
          className="flex-1"
          label="Daily calories"
          value={String(samplePlan.dailyCalories)}
          unit="kcal"
        />
        <KpiTile
          className="flex-1"
          label="Protein"
          value={String(macros.proteinG)}
          unit="g"
          color={brand.protein}
        />
      </View>
      <KpiTile
        size="lg"
        label="Estimated goal"
        value={`${samplePlan.timeline?.weeks ?? '—'}`}
        unit="weeks"
      />

      <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
      <Button label="Secondary" variant="secondary" />
      <Button label="Outline" variant="outline" />
      <Button label="Loading" loading />

      <SkeletonCard />
      <Card>
        <EmptyState
          title="No meals logged yet"
          message="Log your first meal to see it here."
          actionLabel="Log food"
          onAction={() => undefined}
        />
      </Card>
      <Card>
        <ErrorState onRetry={() => undefined} />
      </Card>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Sample sheet">
        <Text tone="muted">{t('common.notMedicalAdvice')}</Text>
        <View className="mt-4">
          <Button label={t('common.close')} onPress={() => setSheetOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
