import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useConsents } from '../profile/useProfile';
import { useNotificationPrefs, usePushPermission, type NotificationPrefs } from './usePush';

const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/** Notification preferences (CLAUDE.md §7.13). */
export function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { supported, query: perm, request } = usePushPermission();
  const { query, update } = useNotificationPrefs();
  const consents = useConsents();
  const marketing =
    consents.query.data?.find((c) => c.consent_type === 'marketing')?.granted ?? false;

  const toggle = (key: keyof NotificationPrefs, label: string, desc: string, disabled = false) => (
    <View key={key} className="flex-row items-center gap-3 py-2.5">
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
        aria-checked={Boolean(query.data?.[key])}
        value={Boolean(query.data?.[key]) && !disabled}
        disabled={disabled}
        aria-disabled={disabled}
        onValueChange={(v) => update.mutate({ [key]: v })}
        trackColor={{ true: colors.primary, false: colors.mutedForeground }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  const permissionCard = () => {
    if (!supported) {
      return (
        <Text tone="muted" className="text-[14px]">
          {t('notificationSettings.unsupported')}
        </Text>
      );
    }
    if (perm.data === 'granted' || perm.isPending) return null;
    return (
      <View className="gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <Text variant="heading" className="text-base">
          🔔 {t('notificationSettings.permissionTitle')}
        </Text>
        <Text className="text-[14px]">
          {perm.data === 'denied'
            ? t('notificationSettings.deniedDesc')
            : t('notificationSettings.permissionDesc')}
        </Text>
        {perm.data === 'denied' ? (
          <Button
            label={t('notificationSettings.openSettings')}
            variant="outline"
            onPress={() => Linking.openSettings()}
          />
        ) : (
          <Button
            label={t('notificationSettings.enable')}
            loading={request.isPending}
            onPress={() => request.mutate()}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notificationSettings.back')}
          onPress={back}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text variant="title" accessibilityRole="header" className="text-[22px]">
          {t('notificationSettings.title')}
        </Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10">
        {permissionCard()}
        {query.isPending ? (
          <SkeletonCard lines={5} />
        ) : query.isError ? (
          <ErrorState
            message={t('notificationSettings.loadFailed')}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <View className="rounded-2xl border border-border bg-card px-4 py-2">
              <Text
                variant="caption"
                tone="muted"
                accessibilityRole="header"
                className="mt-2 font-bold uppercase tracking-wider"
              >
                {t('notificationSettings.reminders')}
              </Text>
              {toggle(
                'meal_reminders',
                t('notificationSettings.mealReminders'),
                t('notificationSettings.mealRemindersDesc'),
              )}
              {toggle(
                'checkin_reminder',
                t('notificationSettings.checkinReminder'),
                t('notificationSettings.checkinReminderDesc'),
              )}
            </View>
            <View className="rounded-2xl border border-border bg-card px-4 py-2">
              <Text
                variant="caption"
                tone="muted"
                accessibilityRole="header"
                className="mt-2 font-bold uppercase tracking-wider"
              >
                {t('notificationSettings.updates')}
              </Text>
              {toggle(
                'streaks',
                t('notificationSettings.streaks'),
                t('notificationSettings.streaksDesc'),
              )}
              {toggle(
                'achievements',
                t('notificationSettings.achievements'),
                t('notificationSettings.achievementsDesc'),
              )}
              {toggle(
                'weekly_report',
                t('notificationSettings.weeklyReport'),
                t('notificationSettings.weeklyReportDesc'),
              )}
              {toggle(
                'promotions',
                t('notificationSettings.promotions'),
                t('notificationSettings.promotionsDesc'),
                !marketing,
              )}
            </View>
            <FormMessage
              message={update.isError ? t('notificationSettings.saveFailed') : undefined}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
