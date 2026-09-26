import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Callout, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { openHealthSettings } from '@/lib/health';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useHealthConnection } from './useHealth';

const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

export const platformName = (platform: string | null) =>
  t(platform === 'health_connect' ? 'healthApps.health_connect' : 'healthApps.healthkit');

/** Profile → Health apps: connect, sync and disconnect Apple Health / Health Connect (§7.12). */
export function HealthScreen() {
  const { colors } = useTheme();
  const { platform, query, connect, disconnect, sync } = useHealthConnection();
  const name = platformName(platform);

  const body = () => {
    if (!platform) return <Callout emoji="📱">{t('health.webOnly')}</Callout>;
    if (query.isPending) return <SkeletonCard lines={3} />;
    if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
    if (!query.data.available)
      return <Callout emoji="⚠️">{t('health.unavailable', { platform: name })}</Callout>;
    if (!query.data.connected) {
      return (
        <View className="gap-3">
          <FormMessage
            message={
              connect.data === false
                ? t('health.denied', { platform: name })
                : connect.isError
                  ? t('health.syncFailed')
                  : undefined
            }
          />
          <Button
            label={t('health.connect', { platform: name })}
            loading={connect.isPending}
            onPress={() => connect.mutate()}
          />
        </View>
      );
    }
    return (
      <View className="gap-3 rounded-2xl border border-success/25 bg-success/10 p-4">
        <Text variant="heading" className="text-base">
          ✅ {t('health.connectedTitle', { platform: name })}
        </Text>
        <Text className="text-[14px]">{t('health.connectedDesc')}</Text>
        <FormMessage
          tone={sync.isError ? 'error' : 'info'}
          message={
            sync.isError
              ? t('health.syncFailed')
              : sync.isSuccess
                ? t('health.synced', { count: sync.data })
                : undefined
          }
        />
        <Button
          label={t('health.syncNow')}
          variant="outline"
          loading={sync.isPending}
          onPress={() => sync.mutate()}
        />
        <Button
          label={t('health.disconnect')}
          variant="ghost"
          loading={disconnect.isPending}
          onPress={() => disconnect.mutate()}
        />
        <Text variant="caption" tone="muted">
          {t('health.disconnectNote', { platform: name })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('health.back')}
          onPress={back}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text variant="title" accessibilityRole="header" className="text-[22px]">
          {t('health.title')}
        </Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10">
        <Text tone="muted" className="text-[14px]">
          {t('health.intro')}
        </Text>
        {body()}
        <Callout emoji="🔒" tone="info">
          {t('health.privacy')}
        </Callout>
        <View className="gap-2 rounded-2xl border border-border bg-card p-4">
          <Text variant="heading" className="text-base">
            ⌚ {t('health.devicesTitle')}
          </Text>
          <Text tone="muted" className="text-[14px]">
            {t('health.devicesDesc', { platform: name })}
          </Text>
          {platform ? (
            <Button
              label={t('health.openSettings', { platform: name })}
              variant="outline"
              onPress={openHealthSettings}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
