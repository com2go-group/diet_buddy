import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, ErrorState, SkeletonCard, SwitchRow, Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useSessionStore } from '../auth/sessionStore';
import {
  BUDGETS,
  COOKING_TIMES,
  CUISINES,
  DEFAULT_MEAL_PREFS,
  loadMealPrefs,
  saveMealPrefs,
  type MealPrefs,
} from './api';

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/**
 * Meal plan preferences (decision log 2026-09-30): cooking time, budget, favourite cuisines and
 * "cook once, eat twice". They shape the next plans; allergies and restrictions stay the hard
 * rules checked in code.
 */
export function MealPrefsScreen() {
  const { colors } = useTheme();
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['mealPrefs', userId],
    enabled: Boolean(userId),
    queryFn: () => loadMealPrefs(userId!),
  });
  const body = () => {
    if (query.isPending) return <SkeletonCard lines={6} />;
    if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
    return (
      <PrefsForm
        userId={userId!}
        initial={query.data ?? DEFAULT_MEAL_PREFS}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['mealPrefs'] })}
      />
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mealPrefs.back')}
          onPress={close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </Pressable>
        <Text variant="title" accessibilityRole="header" className="text-[22px]">
          {t('mealPrefs.title')}
        </Text>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">{body()}</ScrollView>
    </SafeAreaView>
  );
}

/** The form, started from the saved preferences. */
function PrefsForm({
  userId,
  initial,
  onSaved,
}: {
  userId: string;
  initial: MealPrefs;
  onSaved: () => void;
}) {
  const [prefs, setPrefs] = useState<MealPrefs>(initial);
  const save = useMutation({
    mutationFn: () => saveMealPrefs(userId, prefs),
    onSuccess: onSaved,
  });
  const set = (patch: Partial<MealPrefs>) => {
    save.reset();
    setPrefs((p) => ({ ...p, ...patch }));
  };

  const group = (title: string, children: React.ReactNode) => (
    <View className="gap-2">
      <Text variant="label" accessibilityRole="header" className="font-bold">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );

  return (
    <View className="gap-5">
      <Text tone="muted" className="text-[14px]">
        {t('mealPrefs.intro')}
      </Text>
      {group(
        t('mealPrefs.time'),
        COOKING_TIMES.map((v) => (
          <Chip
            key={v}
            selectionRole="radio"
            label={t(`mealPrefs.time_${v}`)}
            selected={prefs.cooking_time === v}
            onPress={() => set({ cooking_time: v })}
          />
        )),
      )}
      {group(
        t('mealPrefs.budget'),
        BUDGETS.map((v) => (
          <Chip
            key={v}
            selectionRole="radio"
            label={t(`mealPrefs.budget_${v}`)}
            selected={prefs.food_budget === v}
            onPress={() => set({ food_budget: v })}
          />
        )),
      )}
      {group(
        t('mealPrefs.cuisines'),
        CUISINES.map((c) => (
          <Chip
            key={c}
            label={t(`mealPrefs.cuisine_${c}`)}
            selected={prefs.cuisines.includes(c)}
            onPress={() =>
              set({
                cuisines: prefs.cuisines.includes(c)
                  ? prefs.cuisines.filter((x) => x !== c)
                  : [...prefs.cuisines, c],
              })
            }
          />
        )),
      )}
      <View className="rounded-2xl border border-border bg-card px-4 py-2">
        <SwitchRow
          label={t('mealPrefs.leftovers')}
          description={t('mealPrefs.leftoversDesc')}
          value={prefs.leftovers}
          onChange={(v) => set({ leftovers: v })}
        />
      </View>
      <FormMessage
        tone={save.isSuccess ? 'info' : 'error'}
        message={
          save.isError ? t('mealPrefs.failed') : save.isSuccess ? t('mealPrefs.saved') : undefined
        }
      />
      <Button label={t('mealPrefs.save')} loading={save.isPending} onPress={() => save.mutate()} />
    </View>
  );
}
