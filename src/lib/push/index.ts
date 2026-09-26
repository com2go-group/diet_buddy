import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_PREFIX, type Reminder } from './reminders';

export { remindersFor, routeFor, type Reminder } from './reminders';

/** Push needs a real phone; the web build and simulators get in-app notifications only. */
export const pushSupported = Platform.OS !== 'web' && Device.isDevice;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function permission(): Promise<PermissionState> {
  if (!pushSupported) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestPermission(): Promise<PermissionState> {
  if (!pushSupported) return 'denied';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'DietBuddy',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

let currentToken: string | null = null;
export const pushToken = () => currentToken;

/** The Expo push token for this device, once permission is granted and the EAS project is set. */
export async function getPushToken(): Promise<string | null> {
  if (!pushSupported || (await permission()) !== 'granted') return null;
  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;
  currentToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return currentToken;
}

/** Replaces DietBuddy's local reminders with these (daily, at local times). */
export async function scheduleReminders(
  reminders: Reminder[],
  text: (r: Reminder) => { title: string; body: string },
) {
  if (!pushSupported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if ((await permission()) !== 'granted') return;
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { ...text(r), data: { route: r.route } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
      },
    });
  }
}

/** Calls back with the data of notifications the user taps (including the one that opened the app). */
export function onNotificationTap(handler: (data: Record<string, unknown>) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const last = Notifications.getLastNotificationResponse();
  if (last) handler(last.notification.request.content.data ?? {});
  const sub = Notifications.addNotificationResponseReceivedListener((response) =>
    handler(response.notification.request.content.data ?? {}),
  );
  return () => sub.remove();
}
