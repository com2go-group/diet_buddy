import { useEffect } from 'react';

import { scheduleOnce } from '@/lib/push';

import { useNotificationPrefs } from '../notifications/usePush';
import { coachTip, tipTime, type TipDay } from './coachTip';

export const COACH_TIP_ID = 'dietbuddy-coach-tip';

/**
 * Keeps today's 17:30 coach tip in line with the day so far: rescheduled whenever Home's data
 * changes (every log refreshes it), cancelled when switched off in Profile → Notifications.
 */
export function useCoachTipReminder(day: TipDay | null, now: Date) {
  const on = useNotificationPrefs().query.data?.coach_tips ?? true;
  const tip = on && day ? coachTip(day) : null;
  const at = tip ? tipTime(now) : null;
  const key = tip && at ? `${at.getTime()}|${tip.title}|${tip.body}` : 'none';
  useEffect(() => {
    scheduleOnce(
      COACH_TIP_ID,
      at,
      tip
        ? { title: tip.title, body: tip.body, route: '/coach' }
        : { title: '', body: '', route: '/coach' },
      now,
    ).catch(() => undefined);
    // `key` captures everything the notification depends on.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
