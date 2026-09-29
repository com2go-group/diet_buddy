import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

/**
 * The evening coach tip (CLAUDE.md §7.13): picked on the device from today's own numbers and sent
 * as a local notification at 17:30, so no data leaves the phone and no AI is called. Tips only
 * ever encourage (protein, water, check-in, a kind word); never "eat less" (§9).
 */
export const COACH_TIP_HOUR = 17;
export const COACH_TIP_MINUTE = 30;

export interface TipDay {
  proteinG: number;
  waterMl: number;
  checkedIn: boolean;
  loggedAnything: boolean;
  targets: { proteinG: number; waterMl: number } | null;
}

export type CoachTip = { persona: 'aria' | 'max' | 'luna'; title: string; body: string };

export function coachTip(day: TipDay): CoachTip | null {
  const { targets } = day;
  if (!targets) return null;
  const proteinLeft = targets.proteinG - day.proteinG;
  if (day.loggedAnything && proteinLeft >= Math.max(25, targets.proteinG * 0.3)) {
    return {
      persona: 'aria',
      title: t('coachTip.ariaTitle'),
      body: t('coachTip.protein', { grams: formatNumber(Math.round(proteinLeft)) }),
    };
  }
  if (day.waterMl < targets.waterMl * 0.5) {
    return { persona: 'max', title: t('coachTip.maxTitle'), body: t('coachTip.water') };
  }
  if (!day.checkedIn) {
    return { persona: 'luna', title: t('coachTip.lunaTitle'), body: t('coachTip.checkin') };
  }
  if (!day.loggedAnything) {
    return { persona: 'aria', title: t('coachTip.ariaTitle'), body: t('coachTip.log') };
  }
  return { persona: 'luna', title: t('coachTip.lunaTitle'), body: t('coachTip.praise') };
}

/** Today at 17:30, or null once that has passed (no tip today then). */
export function tipTime(now: Date): Date | null {
  const at = new Date(now);
  at.setHours(COACH_TIP_HOUR, COACH_TIP_MINUTE, 0, 0);
  return at.getTime() > now.getTime() ? at : null;
}
