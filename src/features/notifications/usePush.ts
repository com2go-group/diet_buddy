import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import {
  getPushToken,
  onNotificationTap,
  permission,
  pushSupported,
  remindersFor,
  requestPermission,
  routeFor,
  scheduleReminders,
} from '@/lib/push';
import { optional, supabase, type Tables } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

export type NotificationPrefs = Pick<
  Tables<'notification_preferences'>,
  | 'meal_reminders'
  | 'checkin_reminder'
  | 'streaks'
  | 'achievements'
  | 'weekly_report'
  | 'promotions'
>;

export const DEFAULT_PREFS: NotificationPrefs = {
  meal_reminders: true,
  checkin_reminder: true,
  streaks: true,
  achievements: true,
  weekly_report: true,
  promotions: false,
};

async function loadPrefs(userId: string): Promise<NotificationPrefs> {
  const result = await supabase
    .from('notification_preferences')
    .select('meal_reminders, checkin_reminder, streaks, achievements, weekly_report, promotions')
    .eq('user_id', userId)
    .limit(1);
  return optional(result)?.[0] ?? DEFAULT_PREFS;
}

async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  optional(
    await supabase.from('notification_preferences').upsert(prefs, { onConflict: 'user_id' }),
  );
}

const reminderText = (kind: 'meal' | 'checkin') =>
  kind === 'meal'
    ? {
        title: t('notificationSettings.reminderMealTitle'),
        body: t('notificationSettings.reminderMealBody'),
      }
    : {
        title: t('notificationSettings.reminderCheckinTitle'),
        body: t('notificationSettings.reminderCheckinBody'),
      };

async function registerDevice(prefs: NotificationPrefs): Promise<void> {
  const token = await getPushToken();
  if (token) {
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  }
  await scheduleReminders(remindersFor(prefs), (r) => reminderText(r.kind));
}

export function useNotificationPrefs() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['notificationPrefs', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadPrefs(userId!),
  });
  const update = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) =>
      savePrefs({ ...(query.data ?? DEFAULT_PREFS), ...patch }),
    onMutate: (patch) => {
      const previous = queryClient.getQueryData<NotificationPrefs>(key);
      queryClient.setQueryData(key, { ...(previous ?? DEFAULT_PREFS), ...patch });
      return { previous };
    },
    onError: (_e, _p, ctx) => queryClient.setQueryData(key, ctx?.previous),
    onSuccess: () => {
      const prefs = queryClient.getQueryData<NotificationPrefs>(key) ?? DEFAULT_PREFS;
      scheduleReminders(remindersFor(prefs), (r) => reminderText(r.kind)).catch(() => undefined);
    },
  });
  return { query, update };
}

export function usePushPermission() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['pushPermission'], queryFn: permission });
  const request = useMutation({
    mutationFn: requestPermission,
    onSuccess: async (state) => {
      queryClient.setQueryData(['pushPermission'], state);
      if (state === 'granted') {
        const userId = useSessionStore.getState().session?.user.id;
        if (userId) await registerDevice(await loadPrefs(userId)).catch(() => undefined);
      }
    },
  });
  return { supported: pushSupported, query, request };
}

/** On sign-in: registers this device for push (if allowed), schedules reminders, routes taps. */
export function usePushSetup(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  useEffect(() => {
    if (!pushSupported || !userId) return;
    loadPrefs(userId)
      .then(registerDevice)
      .catch(() => undefined);
    return onNotificationTap((data) => router.push(routeFor(data) as Href));
  }, [userId]);
}
