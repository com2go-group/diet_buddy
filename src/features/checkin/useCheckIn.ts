import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';

import { useSessionStore } from '../auth/sessionStore';
import { mirrorToHealth } from '../health/useHealth';
import { AlreadyCheckedInError, loadCheckInContext, saveCheckIn } from './api';
import type { CheckInAnswers } from './logic';

export function useCheckIn() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const context = useQuery({
    queryKey: ['checkInContext', userId],
    enabled: Boolean(userId),
    queryFn: () => loadCheckInContext(userId!, new Date()),
    refetchOnMount: 'always',
  });
  const save = useMutation({
    mutationFn: (answers: CheckInAnswers) => saveCheckIn(userId!, answers, new Date()),
    onSuccess: (_r, answers) => {
      haptics.success();
      if (answers.weightKg !== null) mirrorToHealth.weight(answers.weightKg);
    },
    // Home shows the new XP, streak and check-in; refresh it either way (a duplicate means the
    // home screen was stale).
    onSettled: () =>
      Promise.all(
        ['home', 'progress', 'notifications'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });
  return {
    context,
    save,
    alreadyCheckedIn: save.error instanceof AlreadyCheckedInError,
  };
}
