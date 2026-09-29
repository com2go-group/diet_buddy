import { goalReached, maintenanceStepDue, regainedAboveBand } from '@/lib/nutrition';

import type { GoalJourney } from './api';

export type JourneyState = 'reached' | 'nextStep' | 'regain' | null;

/**
 * What the Home card shows: the goal was just reached (switch to maintenance), the next
 * maintenance step is due (two weeks after the last one, while still below maintenance; the
 * step itself decides whether there is anything left), or the trend is well above the kept
 * weight (a gentle offer to refocus). Nothing otherwise.
 */
export function journeyState(j: GoalJourney, now: Date): JourneyState {
  const { goal, plan, trendKg } = j;
  if (!goal || !plan) return null;
  const losing = goal.goalTypes.includes('lose_fat');
  if (losing && !goal.reachedAt && goalReached(trendKg, goal.goalKg)) return 'reached';
  if (!goal.reachedAt || losing) return null;
  if (regainedAboveBand(trendKg, goal.goalKg)) return 'regain';
  if (plan.generatedBy === 'maintenance' && maintenanceStepDue(new Date(plan.createdAt), now)) {
    return 'nextStep';
  }
  return null;
}
