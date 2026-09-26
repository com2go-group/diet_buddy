import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl, Text } from '@/components';
import { t } from '@/i18n';
import { parseDayKey } from '@/lib/dates';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { ManualForm } from './components/ManualForm';
import { PortionPanel } from './components/PortionPanel';
import { SearchPanel } from './components/SearchPanel';
import { SlotTabs } from './components/SlotTabs';
import { gramsFor, logTimeFor, MEAL_SLOTS, portionQuantity } from './portion';
import type { MealSlot, NewFoodLog, PortionFood } from './types';
import { useLogFood } from './useMeals';

const close = () => (router.canGoBack() ? router.back() : router.replace('/meals'));

/** Log Food sheet: search USDA (or pick a recent food), choose a portion, or enter it manually. */
export function LogFoodScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ slot?: string; date?: string }>();
  const [slot, setSlot] = useState<MealSlot>(
    MEAL_SLOTS.includes(params.slot as MealSlot) ? (params.slot as MealSlot) : 'breakfast',
  );
  const [day] = useState(() => parseDayKey(params.date) ?? new Date());
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [picked, setPicked] = useState<PortionFood | null>(null);
  const save = useLogFood();
  const slotLabel = t(`homeScreen.${slot}`);

  const submit = (entry: Omit<NewFoodLog, 'slot' | 'loggedAt'>) =>
    save.mutate(
      { ...entry, slot, loggedAt: logTimeFor(day, slot, new Date()) },
      { onSuccess: close },
    );

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={picked ? t('logFood.back') : t('logFood.close')}
          onPress={() => (picked ? (setPicked(null), save.reset()) : close())}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name={picked ? 'chevron-left' : 'x'} size={18} color={colors.mutedForeground} />
        </Pressable>
        <Text variant="heading" accessibilityRole="header">
          {t('logFood.title')}
        </Text>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-5 pb-8" keyboardShouldPersistTaps="handled">
          <SlotTabs value={slot} onChange={setSlot} />
          {picked ? (
            <PortionPanel
              food={picked}
              slotLabel={slotLabel}
              saving={save.isPending}
              failed={save.isError}
              onAdd={(amount, unit, macros) => {
                const grams = gramsFor(picked, amount, unit);
                submit({
                  name: picked.name,
                  foodRef: picked.ref,
                  ...(picked.kind === 'portion'
                    ? portionQuantity(picked, amount)
                    : { quantity: grams, unit: 'g' }),
                  macros,
                  source: picked.ref ? 'search' : 'manual',
                });
              }}
            />
          ) : (
            <View className="gap-4">
              <SegmentedControl
                accessibilityLabel={t('logFood.title')}
                options={[
                  { value: 'search', label: t('logFood.search') },
                  { value: 'manual', label: t('logFood.manual') },
                ]}
                value={mode}
                onChange={setMode}
              />
              {mode === 'search' ? (
                <SearchPanel onPick={setPicked} />
              ) : (
                <ManualForm
                  slotLabel={slotLabel}
                  saving={save.isPending}
                  failed={save.isError}
                  onAdd={(v) =>
                    submit({
                      name: v.name,
                      foodRef: null,
                      quantity: v.quantity,
                      unit: v.unit || null,
                      macros: {
                        kcal: v.calories,
                        proteinG: v.proteinG ?? 0,
                        carbsG: v.carbsG ?? 0,
                        fatG: v.fatG ?? 0,
                      },
                      source: 'manual',
                    })
                  }
                />
              )}
              <Text variant="caption" tone="muted" className="text-center">
                📷 {t('logFood.photoSoon')}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
