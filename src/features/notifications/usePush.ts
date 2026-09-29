import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { t } from '@/i18n';
import {
  getPushToken,
  onNotificationTap,
  permission,
  planReminders,
  pushSupported,
  requestPermission,
  routeFor,
  scheduleReminders,
  type PlannedReminder,
} from '@/lib/push';
import { DEFAULT_MEAL_TIMES, type ReminderSlot, type TimeOfDay } from '@/lib/push/reminders';
import { optional, supabase, type Tables } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

export type NotificationPrefs = Pick<
  Tables<'notification_preferences'>,
  | 'meal_reminders'
  | 'checkin_reminder'
  | 'water_reminders'
  | 'coach_tips'
  | 'streaks'
  | 'achievements'
  | 'weekly_report'
  | 'promotions'
>;

export const DEFAULT_PREFS: NotificationPrefs = {
  meal_reminders: true,
  checkin_reminder: true,
  water_reminders: true,
  coach_tips: true,
  streaks: true,
  achievements: true,
  weekly_report: true,
  promotions: false,
};

async function loadPrefs(userId: string): Promise<NotificationPrefs> {
  const result = await supabase
    .from('notification_preferences')
    .select(
      'meal_reminders, checkin_reminder, water_reminders, coach_tips, streaks, achievements, weekly_report, promotions',
    )
    .eq('user_id', userId)
    .limit(1);
  return optional(result)?.[0] ?? DEFAULT_PREFS;
}

async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  optional(
    await supabase.from('notification_preferences').upsert(prefs, { onConflict: 'user_id' }),
  );
}

export function reminderText(r: PlannedReminder): { title: string; body: string } {
  if (r.kind === 'meal') {
    return {
      title: t('notificationSettings.reminderMealTitleSlot', {
        meal: t(`homeScreen.${r.slot ?? 'lunch'}`),
      }),
      body: t('notificationSettings.reminderMealBody'),
    };
  }
  if (r.kind === 'water') {
    return {
      title: t('notificationSettings.reminderWaterTitle'),
      body: r.behind
        ? t('notificationSettings.reminderWaterBehind')
        : t('notificationSettings.reminderWaterBody'),
    };
  }
  return {
    title: t('notificationSettings.reminderCheckinTitle'),
    body: t('notificationSettings.reminderCheckinBody'),
  };
}

/** Today's state the reminders depend on, kept up to date by Home (useSmartReminders). */
export interface ReminderDay {
  /** Local date, "YYYY-MM-DD": yesterday's state isn't used for today. */
  date: string;
  mealTimes: Record<ReminderSlot, TimeOfDay>;
  loggedToday: string[];
  waterMlToday: number;
  waterTargetMl: number | null;
  checkedInToday: boolean;
}
export const useReminderDay = create<{ day: ReminderDay | null; set: (d: ReminderDay) => void }>(
  (set) => ({ day: null, set: (day) => set({ day }) }),
);

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Plans and schedules the next days' reminders from the preferences and today's state. */
export async function replanReminders(prefs: NotificationPrefs, now = new Date()): Promise<void> {
  const day = useReminderDay.getState().day;
  const today = day && day.date === localDate(now) ? day : null;
  await scheduleReminders(
    planReminders({
      now,
      prefs,
      mealTimes: day?.mealTimes ?? DEFAULT_MEAL_TIMES,
      loggedToday: new Set(today?.loggedToday ?? []),
      waterMlToday: today?.waterMlToday ?? 0,
      waterTargetMl: day?.waterTargetMl ?? null,
      checkedInToday: today?.checkedInToday ?? false,
    }),
    reminderText,
  );
}

async function registerDevice(prefs: NotificationPrefs): Promise<void> {
  const token = await getPushToken();
  if (token) {
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  }
  await replanReminders(prefs);
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
      replanReminders(prefs).catch(() => undefined);
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

/**
 * Re-plans reminders whenever today's logs change (Home passes them in): meal reminders at the
 * learned times for meals not logged yet, water nudges when behind, check-in until done.
 */
export function useSmartReminders(day: Omit<ReminderDay, 'date'> | null, now: Date): void {
  const prefs = useNotificationPrefs().query.data;
  const setDay = useReminderDay((s) => s.set);
  const key = day && prefs ? JSON.stringify([localDate(now), day, prefs]) : null;
  useEffect(() => {
    if (!key || !day || !prefs || !pushSupported) return;
    setDay({ ...day, date: localDate(now) });
    replanReminders(prefs, now).catch(() => undefined);
    // `key` captures everything the plan depends on.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
