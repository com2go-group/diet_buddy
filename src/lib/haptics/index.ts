import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics for significant actions only: logging a meal, completing a check-in,
 * unlocking an achievement (CLAUDE.md §5). Fails silently where unsupported.
 */
export const haptics = {
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  selection: () => run(() => Haptics.selectionAsync()),
  impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
};

function run(fn: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
}
