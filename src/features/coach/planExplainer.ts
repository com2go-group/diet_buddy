import { useQuery } from '@tanstack/react-query';

import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { optional, supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

export interface PlanNumbers {
  calories: number;
  proteinG: number;
  waterMl: number;
  /** Daily energy use (latest body metrics), if known. */
  tdee: number | null;
}

/**
 * Aria's first message: the user's own plan explained in plain words. Written from the plan's
 * numbers in code (no AI call), so it is instant and never invents anything.
 */
export function explainPlan(plan: PlanNumbers): string {
  const kcal = formatNumber(plan.calories);
  const parts: string[] = [];
  if (plan.tdee) {
    const gap = Math.round(plan.calories - plan.tdee);
    const tdee = formatNumber(Math.round(plan.tdee));
    if (gap <= -50) {
      parts.push(t('coach.explainDeficit', { kcal, tdee, gap: formatNumber(-gap) }));
    } else if (gap >= 50) {
      parts.push(t('coach.explainSurplus', { kcal, tdee, gap: formatNumber(gap) }));
    } else {
      parts.push(t('coach.explainMaintain', { kcal, tdee }));
    }
  } else {
    parts.push(t('coach.explainTarget', { kcal }));
  }
  parts.push(t('coach.explainProtein', { protein: formatNumber(plan.proteinG) }));
  parts.push(t('coach.explainWater', { litres: formatDecimal(plan.waterMl / 1000) }));
  parts.push(t('coach.explainAsk'));
  return parts.join(' ');
}

async function loadPlanNumbers(userId: string): Promise<PlanNumbers | null> {
  const [plans, metrics] = await Promise.all([
    supabase
      .from('plans')
      .select('daily_calories, protein_g, water_ml')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('body_metrics')
      .select('tdee')
      .eq('user_id', userId)
      .not('tdee', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1),
  ]);
  const plan = optional(plans)?.[0];
  if (!plan) return null;
  return {
    calories: plan.daily_calories,
    proteinG: plan.protein_g,
    waterMl: plan.water_ml,
    tdee: optional(metrics)?.[0]?.tdee ?? null,
  };
}

/** The explanation for the signed-in user, or null while loading / without a plan. */
export function usePlanExplainer(enabled: boolean): string | null {
  const userId = useSessionStore((s) => s.session?.user.id);
  const query = useQuery({
    queryKey: ['planExplainer', userId],
    enabled: enabled && Boolean(userId),
    queryFn: () => loadPlanNumbers(userId!),
    staleTime: 5 * 60_000,
  });
  return query.data ? explainPlan(query.data) : null;
}
