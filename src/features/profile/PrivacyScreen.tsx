import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, Sheet, SkeletonCard, Text, TextField } from '@/components';
import { t } from '@/i18n';
import { formatLongDate } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import type { OptionalConsent } from './api';
import { useConsents, useDeleteAccount, useExportData } from './useProfile';

const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4 gap-3 rounded-2xl border border-border bg-card p-4">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Privacy & Data (CLAUDE.md §7.14, §13): consents, JSON export and account deletion. */
export function PrivacyScreen() {
  const { colors } = useTheme();
  const { query, update } = useConsents();
  const exporter = useExportData();
  const remover = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  const consent = (type: string) => query.data?.find((c) => c.consent_type === type);
  const toggle = (type: OptionalConsent, label: string, desc: string) => {
    const granted = consent(type)?.granted ?? false;
    return (
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text variant="label" className="font-semibold text-[15px]">
            {label}
          </Text>
          <Text variant="caption" tone="muted" className="text-[13px]">
            {desc}
          </Text>
        </View>
        <Switch
          accessibilityLabel={label}
          aria-checked={granted}
          value={granted}
          disabled={update.isPending}
          aria-disabled={update.isPending}
          onValueChange={(v) => update.mutate({ type, granted: v })}
          trackColor={{ true: colors.primary, false: colors.mutedForeground }}
          thumbColor="#FFFFFF"
        />
      </View>
    );
  };

  const health = consent('health_data');
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('privacy.back')}
          onPress={back}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text variant="title" accessibilityRole="header" className="text-[22px]">
          {t('privacy.title')}
        </Text>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <Card title={t('privacy.consents')}>
          {query.isPending ? (
            <SkeletonCard lines={3} />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : (
            <>
              <View>
                <Text variant="label" className="font-semibold text-[15px]">
                  {t('privacy.healthData')}
                </Text>
                {health?.granted ? (
                  <Text variant="caption" tone="success" className="font-semibold">
                    ✓{' '}
                    {t('privacy.grantedOn', { date: formatLongDate(new Date(health.updated_at)) })}
                  </Text>
                ) : null}
                <Text variant="caption" tone="muted" className="mt-1 text-[13px]">
                  {t('privacy.healthDataDesc')}
                </Text>
              </View>
              {toggle('analytics', t('privacy.analytics'), t('privacy.analyticsDesc'))}
              {toggle('marketing', t('privacy.marketing'), t('privacy.marketingDesc'))}
              {toggle('body_photos', t('privacy.bodyPhotos'), t('privacy.bodyPhotosDesc'))}
              {toggle('coach_insights', t('privacy.coachInsights'), t('privacy.coachInsightsDesc'))}
              <View>
                <Text variant="label" className="font-semibold text-[15px]">
                  {t('privacy.ads')}
                </Text>
                <Text variant="caption" tone="muted" className="text-[13px]">
                  {t('privacy.adsDesc')}
                </Text>
              </View>
              <FormMessage message={update.isError ? t('privacy.consentFailed') : undefined} />
            </>
          )}
        </Card>

        <Card title={t('privacy.exportTitle')}>
          <Text tone="muted" className="text-[14px]">
            {t('privacy.exportDesc')}
          </Text>
          <FormMessage
            tone={exporter.isSuccess ? 'info' : 'error'}
            message={
              exporter.isSuccess
                ? t('privacy.exported')
                : exporter.isError
                  ? t('privacy.exportFailed')
                  : undefined
            }
          />
          <Button
            label={t('privacy.exportButton')}
            variant="outline"
            icon={<Feather name="download" size={16} color={colors.foreground} />}
            loading={exporter.isPending}
            onPress={() => exporter.mutate()}
          />
        </Card>

        <Card title={t('privacy.deleteTitle')}>
          <Text tone="muted" className="text-[14px]">
            {t('privacy.deleteDesc')}
          </Text>
          <Button
            label={t('privacy.deleteButton')}
            variant="destructive"
            onPress={() => setConfirming(true)}
          />
        </Card>
      </ScrollView>

      <Sheet
        visible={confirming}
        onClose={() => {
          if (remover.isPending) return;
          setConfirming(false);
          setTyped('');
          remover.reset();
        }}
        title={t('privacy.deleteConfirmTitle')}
      >
        <View className="gap-4 pb-2">
          <Text>{t('privacy.deleteConfirmDesc')}</Text>
          <TextField
            label={t('privacy.deleteConfirmLabel')}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <FormMessage message={remover.isError ? t('privacy.deleteFailed') : undefined} />
          <Button
            label={t('privacy.deleteConfirmButton')}
            variant="destructive"
            disabled={typed.trim() !== 'DELETE'}
            loading={remover.isPending}
            hapticOnPress
            onPress={() => remover.mutate()}
          />
          <Button
            label={t('privacy.cancel')}
            variant="ghost"
            disabled={remover.isPending}
            onPress={() => {
              setConfirming(false);
              setTyped('');
            }}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
