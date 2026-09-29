import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components';
import { t } from '@/i18n';
import { optional, supabase } from '@/lib/supabase';
import { accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { checklistActive, useJourneyStore } from '../journeyStore';
import type { HomeData } from '../summary';

type Item = 'meal' | 'water' | 'checkin' | 'coach';

async function hasTalkedToCoach(userId: string): Promise<boolean> {
  const rows = optional(
    await supabase
      .from('coach_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'user')
      .limit(1),
  );
  return (rows ?? []).length > 0;
}

/** What a new user has done so far (from the rows Home already loaded, plus the coach). */
export function checklistDone(data: HomeData, coach: boolean): Record<Item, boolean> {
  return {
    meal: data.food.length > 0,
    water: data.water.length > 0,
    checkin: data.checkins.length > 0,
    coach,
  };
}

/**
 * A new user's first steps (for 3 days after onboarding): log a meal, drink a glass, check in and
 * meet the coach. Each row goes where it's done; the card can be closed any time.
 */
export function FirstDayChecklist({
  userId,
  data,
  now,
  onAddGlass,
}: {
  userId: string;
  data: HomeData;
  now: Date;
  onAddGlass: () => void;
}) {
  const { colors, scheme } = useTheme();
  const onboardedAt = useJourneyStore((s) => s.onboardedAt[userId]);
  const dismissed = useJourneyStore((s) => s.checklistDismissed[userId]);
  const dismiss = useJourneyStore((s) => s.dismissChecklist);
  const active = checklistActive(onboardedAt, now) && !dismissed;
  const coach = useQuery({
    queryKey: ['coachStarted', userId],
    enabled: active,
    queryFn: () => hasTalkedToCoach(userId),
  });
  if (!active) return null;

  const done = checklistDone(data, Boolean(coach.data));
  const count = Object.values(done).filter(Boolean).length;
  const actions: Record<Item, () => void> = {
    meal: () => router.navigate('/meals'),
    water: onAddGlass,
    checkin: () => router.push('/check-in'),
    coach: () => router.navigate('/coach'),
  };

  return (
    <Card className="mb-4 gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="heading" accessibilityRole="header" className="text-base">
            {count === 4 ? t('checklist.doneTitle') : t('checklist.title')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('checklist.progress', { done: count, total: 4 })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('checklist.close')}
          onPress={() => dismiss(userId)}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full active:opacity-70"
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {(['meal', 'water', 'checkin', 'coach'] as const).map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          aria-disabled={done[item]}
          disabled={done[item]}
          accessibilityLabel={`${t(`checklist.${item}`)}${done[item] ? `, ${t('checklist.doneA11y')}` : ''}`}
          onPress={actions[item]}
          style={{ minHeight: MIN_TOUCH_TARGET }}
          className="flex-row items-center gap-3 rounded-2xl bg-muted px-3 active:opacity-80"
        >
          <Feather
            name={done[item] ? 'check-circle' : 'circle'}
            size={20}
            color={done[item] ? accentColor('green', scheme) : colors.mutedForeground}
          />
          <Text
            className={done[item] ? 'flex-1 text-[14px] line-through' : 'flex-1 text-[14px]'}
            tone={done[item] ? 'muted' : undefined}
          >
            {t(`checklist.${item}`)}
          </Text>
          {done[item] ? null : (
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          )}
        </Pressable>
      ))}
    </Card>
  );
}
