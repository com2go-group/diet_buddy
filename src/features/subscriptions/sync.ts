import { t } from '@/i18n';
import { formatLongDate } from '@/lib/format';
import { scheduleOnce } from '@/lib/push';
import { supabase } from '@/lib/supabase';

/**
 * Asks the server to check the user's Premium with RevenueCat now (after a purchase or restore),
 * so server-checked features unlock without waiting for the webhook. Best effort: the webhook
 * still arrives, so a failure here only means a few seconds' wait.
 */
export async function syncPremium(): Promise<void> {
  try {
    await supabase.functions.invoke('sync-premium', { method: 'POST' });
  } catch {
    // Best effort; the webhook follows.
  }
}

export const TRIAL_REMINDER_ID = 'dietbuddy-trial-ending';
const TWO_DAYS = 2 * 86_400_000;

/** When to remind: 2 days before the trial ends, or halfway through a shorter one (sandbox). */
export function trialReminderTime(trialEndsAt: Date | null, now: Date): Date | null {
  if (!trialEndsAt) return null;
  const left = trialEndsAt.getTime() - now.getTime();
  if (left <= 0) return null;
  return new Date(
    left > TWO_DAYS * 1.5 ? trialEndsAt.getTime() - TWO_DAYS : now.getTime() + left / 2,
  );
}

/**
 * A local reminder before a free trial turns into a paid subscription (only while it will renew;
 * cancelled trials get none). `null` cancels it, e.g. on sign-out.
 */
export async function scheduleTrialReminder(trialEndsAt: Date | null, now = new Date()) {
  await scheduleOnce(
    TRIAL_REMINDER_ID,
    trialReminderTime(trialEndsAt, now),
    {
      title: t('paywall.trialReminderTitle'),
      body: trialEndsAt
        ? t('paywall.trialReminderBody', { date: formatLongDate(trialEndsAt) })
        : '',
      route: '/paywall',
    },
    now,
  ).catch(() => undefined);
}
