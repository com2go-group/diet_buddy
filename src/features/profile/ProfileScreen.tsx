import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatLongDate, formatNumber, formatWeight } from '@/lib/format';
import { parseDayKey } from '@/lib/dates';
import { ACCENTS, useThemeStore, useTheme, type ThemePreference } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { authConfig } from '../auth/config';
import { signOut } from '../auth';
import { useSessionStore } from '../auth/sessionStore';
import { NotificationBell } from '../notifications';
import { ChoiceSheet } from './components/ChoiceSheet';
import { GoalEditSheet, type GoalEdit } from './components/GoalEditSheet';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileInfoSheet, type ProfileInfo } from './components/ProfileInfoSheet';
import { SettingsRow, SettingsSection } from './components/Settings';
import { minCalories } from './goals';
import { useAdPrivacyOptions } from '../ads';
import { useHealthStore } from '../health/useHealth';
import { usePaywall } from '../subscriptions/usePaywall';
import { usePremium } from '../subscriptions/usePremium';
import { useProfileOverview } from './useProfile';

/** Profile & settings (CLAUDE.md §7.14). */
export function ProfileScreen() {
  const { colors } = useTheme();
  const user = useSessionStore((s) => s.session?.user);
  const { preference, setPreference } = useThemeStore();
  const { query, units, plan } = useProfileOverview();
  const { premium } = usePremium();
  const adPrivacy = useAdPrivacyOptions();
  const healthConnected = useHealthStore((s) => s.connected);
  const { available: purchasesOn, restore } = usePaywall();
  const [sheet, setSheet] = useState<'theme' | 'units' | null>(null);
  const [edit, setEdit] = useState<GoalEdit | null>(null);
  const [info, setInfo] = useState<ProfileInfo>(null);
  const [signingOut, setSigningOut] = useState(false);

  const body = () => {
    if (query.isPending) {
      return (
        <>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </>
      );
    }
    if (query.isError)
      return <ErrorState message={t('profile.loadFailed')} onRetry={() => query.refetch()} />;
    const data = query.data;
    const { profile } = data;
    const floor = minCalories(profile.gender ?? 'unspecified', data.latest.bmr);
    const max = Math.max(
      floor + 100,
      data.latest.tdee ? Math.round(data.latest.tdee + 1000) : 4000,
    );
    const goalDate = parseDayKey(data.goal?.goalDate);
    return (
      <>
        <ProfileHeader
          name={profile.name ?? ''}
          contact={user?.email || user?.phone || ''}
          premium={premium}
          xp={profile.xp}
          stats={data.stats}
        />
        {!data.checkedInToday ? (
          <View className="mb-4">
            <Button
              label={`✅ ${t('profile.checkIn')}`}
              variant="secondary"
              onPress={() => router.push('/check-in')}
            />
          </View>
        ) : null}
        {!premium ? (
          <View
            className="mb-5 rounded-2xl border border-primary/30 p-4"
            style={{ backgroundColor: '#1A1A2E' }}
          >
            <Text className="font-extrabold text-lg" style={{ color: ACCENTS.amber.dark }}>
              👑 {t('profile.upgradeTitle')}
            </Text>
            <Text className="mb-3 mt-1 text-[14px]" style={{ color: '#F1F5F9' }}>
              {t('profile.upgradeDesc')}
            </Text>
            <Button label={t('profile.upgradeTitle')} onPress={() => router.push('/paywall')} />
          </View>
        ) : null}

        <SettingsSection title={t('profile.account')}>
          <SettingsRow
            icon="bell"
            label={t('profile.notifications')}
            value={t('profile.notificationsDesc')}
            onPress={() => router.push('/notification-settings')}
          />
          <SettingsRow
            icon="moon"
            label={t('profile.appearance')}
            value={t(`profile.theme_${preference}`)}
            onPress={() => setSheet('theme')}
          />
          <SettingsRow
            icon="sliders"
            label={t('profile.units')}
            value={t(`profile.units_${profile.units}`)}
            onPress={() => setSheet('units')}
          />
          <SettingsRow
            icon="activity"
            label={t('profile.healthApps')}
            value={healthConnected ? t('profile.healthConnected') : t('profile.healthNotConnected')}
            onPress={() => router.push('/health')}
          />
          {adPrivacy.required ? (
            <SettingsRow
              icon="eye-off"
              label={t('profile.adPrivacy')}
              onPress={() => adPrivacy.open().catch(() => undefined)}
            />
          ) : null}
          {purchasesOn ? (
            <SettingsRow
              icon="refresh-cw"
              label={t('profile.restore')}
              value={
                restore.isPending
                  ? '…'
                  : restore.isError
                    ? t('paywall.restoreFailed')
                    : restore.isSuccess
                      ? restore.data
                        ? t('paywall.restored')
                        : t('paywall.nothingToRestore')
                      : undefined
              }
              onPress={() => !restore.isPending && restore.mutate()}
            />
          ) : null}
          <SettingsRow
            icon="shield"
            label={t('profile.privacy')}
            value={t('profile.privacyDesc')}
            onPress={() => router.push('/privacy')}
            last
          />
        </SettingsSection>
        <FormMessage message={units.isError ? t('profile.unitsFailed') : undefined} />

        <SettingsSection title={t('profile.goals')}>
          <SettingsRow
            icon="⚖️"
            label={t('profile.weightGoal')}
            value={
              data.goal?.goalKg && goalDate
                ? t('profile.weightGoalValue', {
                    weight: formatWeight(data.goal.goalKg, profile.units, 0),
                    date: formatLongDate(goalDate),
                  })
                : t('profile.weightGoalNone')
            }
            onPress={() => setInfo('weightGoal')}
          />
          {data.plan ? (
            <>
              <SettingsRow
                icon="🎯"
                label={t('profile.calorieTarget')}
                value={t('profile.calorieValue', { kcal: formatNumber(data.plan.daily_calories) })}
                onPress={() => setEdit('calories')}
              />
              <SettingsRow
                icon="💧"
                label={t('profile.hydrationGoal')}
                value={t('profile.hydrationValue', {
                  litres: formatDecimal(data.plan.water_ml / 1000),
                })}
                onPress={() => setEdit('water')}
                last
              />
            </>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t('profile.support')}>
          <SettingsRow
            icon="help-circle"
            label={t('profile.help')}
            onPress={() => router.push('/help')}
          />
          <SettingsRow icon="star" label={t('profile.rate')} onPress={() => setInfo('rate')} />
          {authConfig.termsUrl ? (
            <SettingsRow
              icon="file-text"
              label={t('profile.terms')}
              onPress={() => Linking.openURL(authConfig.termsUrl!)}
            />
          ) : null}
          {authConfig.privacyUrl ? (
            <SettingsRow
              icon="lock"
              label={t('profile.privacyPolicy')}
              onPress={() => Linking.openURL(authConfig.privacyUrl!)}
            />
          ) : null}
          <SettingsRow
            icon="log-out"
            label={t('profile.signOut')}
            destructive
            last
            onPress={async () => {
              if (signingOut) return;
              setSigningOut(true);
              await signOut()
                .catch(() => undefined)
                .finally(() => setSigningOut(false));
            }}
          />
        </SettingsSection>
        <Text variant="caption" tone="muted" className="mb-4 text-center">
          {t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        </Text>

        {data.plan ? (
          <GoalEditSheet
            key={`${edit}-${data.plan.version}`}
            edit={edit}
            plan={data.plan}
            floor={floor}
            max={max}
            tdee={data.latest.tdee}
            saving={plan.isPending}
            failed={plan.isError}
            onSave={(next) => plan.mutate(next, { onSuccess: () => setEdit(null) })}
            onClose={() => {
              plan.reset();
              setEdit(null);
            }}
          />
        ) : null}
        <ChoiceSheet<ThemePreference>
          title={t('profile.appearance')}
          visible={sheet === 'theme'}
          value={preference}
          options={(['system', 'light', 'dark'] as const).map((v) => ({
            value: v,
            label: t(`profile.theme_${v}`),
          }))}
          onChoose={setPreference}
          onClose={() => setSheet(null)}
        />
        <ChoiceSheet
          title={t('profile.units')}
          visible={sheet === 'units'}
          value={profile.units}
          options={(['metric', 'imperial'] as const).map((v) => ({
            value: v,
            label: t(`profile.units_${v}`),
          }))}
          onChoose={(v) => units.mutate(v)}
          onClose={() => setSheet(null)}
        />
      </>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View className="flex-row items-center justify-between pb-4 pt-3">
          <Text variant="title" accessibilityRole="header" className="text-[22px]">
            {t('profile.title')}
          </Text>
          <NotificationBell />
        </View>
        {body()}
      </ScrollView>
      <ProfileInfoSheet info={info} onClose={() => setInfo(null)} />
    </SafeAreaView>
  );
}
