import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adaptivePlan, type AdaptiveResult } from '@/lib/nutrition';

import { useSessionStore } from '../auth/sessionStore';
import { useJourneyStore } from '../home/journeyStore';
import { savePlanVersion } from '../profile/api';
import { withCalories } from '../profile/goals';
import { loadPlanReview, REVIEW_EVERY_DAYS, type PlanReviewData } from './api';

const DAY_MS = 86_400_000;

/** Due when both the current plan and the last answer are at least two weeks old. */
export function reviewDue(planCreatedAt: string, reviewedAt: string | undefined, now: Date) {
  const since = (iso: string) => (now.getTime() - new Date(iso).getTime()) / DAY_MS;
  return (
    since(planCreatedAt) >= REVIEW_EVERY_DAYS &&
    (!reviewedAt || since(reviewedAt) >= REVIEW_EVERY_DAYS)
  );
}

export type PlanSuggestion = Extract<AdaptiveResult, { kind: 'suggest' }>;

/** The two-weekly plan check-in: a suggestion to show, or null. */
export function usePlanReview(now: Date) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const reviewedAt = useJourneyStore((s) => (userId ? s.planReviewedAt[userId] : undefined));
  const reviewed = useJourneyStore((s) => s.planReviewed);
  const queryClient = useQueryClient();
  const recentlyAnswered =
    reviewedAt !== undefined &&
    (now.getTime() - new Date(reviewedAt).getTime()) / DAY_MS < REVIEW_EVERY_DAYS;
  const query = useQuery({
    queryKey: ['planReview', userId],
    enabled: Boolean(userId) && !recentlyAnswered,
    queryFn: () => loadPlanReview(userId!, now),
    staleTime: 60 * 60_000,
  });
  const data: PlanReviewData | null | undefined = query.data;
  const result =
    data && reviewDue(data.planCreatedAt, reviewedAt, now) ? adaptivePlan(data.input) : null;
  const suggestion: PlanSuggestion | null = result?.kind === 'suggest' ? result : null;

  const accept = useMutation({
    mutationFn: async () => {
      const next = withCalories(
        data!.plan,
        suggestion!.suggested,
        data!.input.floor,
        suggestion!.estimatedTdee,
      );
      await savePlanVersion(userId!, next);
    },
    onSuccess: async () => {
      reviewed(userId!);
      await Promise.all(
        ['home', 'profileOverview', 'meals', 'progress', 'planReview', 'planExplainer'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });

  return {
    suggestion: recentlyAnswered ? null : suggestion,
    accept,
    dismiss: () => userId && reviewed(userId),
  };
}
