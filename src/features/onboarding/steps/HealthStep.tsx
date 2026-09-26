import { Linking, Platform, View } from 'react-native';

import { Button, Callout, Text } from '@/components';
import { t } from '@/i18n';

import { useHealthConnection } from '../../health/useHealth';
import { HEALTH_PLATFORMS, SMART_SCALES, WEARABLES } from '../options';
import { StepHeader } from './shared';

// iOS shows Apple Health, Android shows Health Connect; web (development) shows both.
const platforms = HEALTH_PLATFORMS.filter((p) => Platform.OS === 'web' || p.os === Platform.OS);
const platformName = t(
  Platform.OS === 'android' ? 'healthApps.health_connect' : 'healthApps.healthkit',
);

/**
 * Connects Apple Health (iOS) or Health Connect (Android). Optional: onboarding continues either
 * way, and it can be connected later in Profile → Health apps.
 */
export function HealthAppsStep() {
  const { platform, query, connect } = useHealthConnection();
  const status = (id: string) => {
    if (!platform || id !== platform) return null;
    if (query.data?.connected) {
      return (
        <Text variant="caption" tone="success" className="font-bold">
          {t('healthApps.connected')}
        </Text>
      );
    }
    if (query.data && !query.data.available) {
      return (
        <Text variant="caption" tone="muted" className="max-w-[96px] text-right">
          {t('healthApps.notAvailable')}
        </Text>
      );
    }
    return (
      <Button
        label={t('healthApps.connect')}
        size="md"
        fullWidth={false}
        loading={connect.isPending}
        disabled={query.isPending}
        onPress={() => connect.mutate()}
      />
    );
  };
  return (
    <>
      <StepHeader emoji="📲" title={t('healthApps.title')} subtitle={t('healthApps.subtitle')} />
      <Callout emoji="🔒" tone="info" className="mb-4">
        {t('healthApps.privacy')}
      </Callout>
      <View className="gap-3">
        {platforms.map((p) => (
          <View
            key={p.id}
            accessible={!platform}
            className="flex-row items-center gap-3.5 rounded-2xl border-[1.5px] border-border bg-card p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Text className="text-2xl leading-8">{p.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text variant="label" className="font-bold">
                {t(`healthApps.${p.id}`)}
              </Text>
              <Text variant="caption" tone="muted" className="mt-0.5">
                {t(`healthApps.${p.id}Sub`)}
              </Text>
            </View>
            {status(p.id)}
          </View>
        ))}
      </View>
      <Callout emoji="💡" className="mt-4">
        {platform ? t('healthApps.optional') : t('healthApps.phoneOnly')}
      </Callout>
    </>
  );
}

function openHealthApp() {
  const url =
    Platform.OS === 'ios'
      ? 'x-apple-health://'
      : 'market://details?id=com.google.android.apps.healthdata';
  Linking.openURL(url).catch(() => undefined);
}

/**
 * Scales and wearables work through Apple Health / Health Connect, not individual integrations
 * (CLAUDE.md §7.12), so this step explains that rather than offering per-device pairing.
 */
export function DevicesStep() {
  return (
    <>
      <StepHeader emoji="📡" title={t('devices.title')} subtitle={t('devices.subtitle')} />
      <Callout emoji="🔗" tone="info" className="mb-5">
        {t('devices.howItWorks', { platform: platformName })}
      </Callout>
      <Text
        variant="caption"
        tone="muted"
        className="mb-2.5 font-extrabold uppercase tracking-widest"
      >
        {t('devices.scales')}
      </Text>
      <View className="mb-5 gap-2">
        {SMART_SCALES.map((d) => (
          <DeviceRow key={d.id} id={d.id} emoji={d.emoji} />
        ))}
      </View>
      <Text
        variant="caption"
        tone="muted"
        className="mb-2.5 font-extrabold uppercase tracking-widest"
      >
        {t('devices.wearables')}
      </Text>
      <View className="gap-2">
        {WEARABLES.map((d) => (
          <DeviceRow key={d.id} id={d.id} emoji={d.emoji} />
        ))}
      </View>
      {Platform.OS !== 'web' ? (
        <View className="mt-5">
          <Button
            variant="outline"
            label={t('devices.open', { platform: platformName })}
            onPress={openHealthApp}
          />
        </View>
      ) : null}
    </>
  );
}

function DeviceRow({ id, emoji }: { id: string; emoji: string }) {
  const key = id as 'withings';
  return (
    <View
      accessible
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
        <Text className="text-xl leading-7">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text variant="label" className="font-bold">
          {t(`onboardingDevices.${key}`)}
        </Text>
        <Text variant="caption" tone="muted">
          {t(`onboardingDevices.${key}Desc`)}
        </Text>
      </View>
    </View>
  );
}
