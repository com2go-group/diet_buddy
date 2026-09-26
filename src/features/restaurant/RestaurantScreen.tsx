import { Feather } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Callout,
  EmptyState,
  SegmentedControl,
  SkeletonCard,
  Text,
  TextField,
} from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { pickPhoto } from '@/lib/images';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { SlotTabs } from '../meals/components/SlotTabs';
import { logTimeFor } from '../meals/portion';
import type { MealSlot } from '../meals/types';
import { useLogFood } from '../meals/useMeals';
import { usePremium } from '../subscriptions/usePremium';
import { analyzeMenu, currentSlot, MenuError, type Dish } from './api';
import { DishCard } from './components/DishCard';

const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

const ERRORS = {
  not_configured: 'restaurant.notConfigured',
  rate_limited: 'restaurant.rateLimited',
  premium_required: 'restaurant.premiumPending',
  invalid_image: 'restaurant.invalidImage',
  failed: 'restaurant.failed',
} as const;

/** Restaurant mode (Premium): scan a menu or type dishes, ranked for this meal. */
export function RestaurantScreen() {
  const { colors } = useTheme();
  const { premium, loading } = usePremium();
  const [now] = useState(() => new Date());
  const [slot, setSlot] = useState<MealSlot>(() => currentSlot(now));
  const [mode, setMode] = useState<'scan' | 'type'>('scan');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [logged, setLogged] = useState<string | null>(null);
  const analyse = useMutation({
    mutationFn: (input: { image: string } | { dishes: string }) =>
      analyzeMenu(input, slot, new Date()),
  });
  const save = useLogFood();
  const mealLabel = t(`homeScreen.${slot}`).toLowerCase();

  const scan = async (source: 'camera' | 'library') => {
    setNotice(null);
    const picked = await pickPhoto(source, 0.6).catch(() => ({ kind: 'cancelled' as const }));
    if (picked.kind === 'photo') analyse.mutate({ image: picked.base64 });
    else if (picked.kind === 'denied') setNotice(t('restaurant.denied'));
    else if (picked.kind === 'tooLarge') setNotice(t('restaurant.tooLarge'));
    else if (picked.kind === 'unsupported') setNotice(t('restaurant.invalidImage'));
  };

  const logDish = (dish: Dish) => {
    if (!dish.estimate) return;
    save.mutate(
      {
        slot,
        loggedAt: logTimeFor(now, slot, new Date()),
        name: dish.name,
        foodRef: null,
        quantity: 1,
        unit: 'dish',
        macros: {
          kcal: dish.estimate.kcal,
          proteinG: dish.estimate.proteinG,
          carbsG: dish.estimate.carbsG,
          fatG: dish.estimate.fatG,
        },
        source: 'restaurant',
      },
      { onSuccess: () => setLogged(dish.name) },
    );
  };

  const input = () => (
    <View className="gap-4">
      <Text tone="muted">{t('restaurant.intro')}</Text>
      <View className="gap-2">
        <Text variant="label">{t('restaurant.meal')}</Text>
        <SlotTabs value={slot} onChange={setSlot} />
      </View>
      <SegmentedControl
        accessibilityLabel={t('restaurant.title')}
        options={[
          { value: 'scan', label: t('restaurant.scan') },
          { value: 'type', label: t('restaurant.type') },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'scan' ? (
        <View className="gap-2">
          <Callout emoji="🔒" tone="info">
            {t('restaurant.privacy')}
          </Callout>
          <FormMessage message={notice ?? undefined} />
          <Button label={t('restaurant.takePhoto')} onPress={() => scan('camera')} />
          <Button
            label={t('restaurant.choosePhoto')}
            variant="outline"
            onPress={() => scan('library')}
          />
        </View>
      ) : (
        <View className="gap-3">
          <TextField
            label={t('restaurant.dishesLabel')}
            placeholder={t('restaurant.dishesPlaceholder')}
            hint={t('restaurant.dishesHint')}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          <Button
            label={t('restaurant.analyse')}
            disabled={text.trim().length < 2}
            onPress={() => analyse.mutate({ dishes: text.trim() })}
          />
        </View>
      )}
    </View>
  );

  const body = () => {
    if (loading) return <SkeletonCard lines={4} />;
    if (!premium) {
      return (
        <View className="gap-4">
          <Callout emoji="⭐">{t('restaurant.locked')}</Callout>
          <Button label={t('restaurant.upgrade')} onPress={() => router.push('/paywall')} />
        </View>
      );
    }
    if (analyse.isPending) {
      return (
        <View className="gap-3" aria-busy>
          <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
            {t('restaurant.analysing')}
          </Text>
          <SkeletonCard lines={5} />
        </View>
      );
    }
    const again = (
      <Button
        label={t('restaurant.again')}
        variant="outline"
        onPress={() => (analyse.reset(), setLogged(null), save.reset())}
      />
    );
    if (analyse.isError) {
      const code = analyse.error instanceof MenuError ? analyse.error.code : 'failed';
      return (
        <View className="gap-4">
          <Callout emoji="⚠️" tone="danger" live>
            {t(ERRORS[code])}
          </Callout>
          {again}
        </View>
      );
    }
    const result = analyse.data;
    if (!result) return input();
    if (!result.dishes.length) {
      return (
        <View className="gap-4">
          <EmptyState
            emoji="🍽️"
            title={t('restaurant.empty')}
            message={t('restaurant.emptyDesc')}
          />
          {again}
        </View>
      );
    }
    const bestIndex = result.dishes.findIndex((d) => d.estimate && !d.warnings.length);
    return (
      <View className="gap-3">
        <Text className="font-semibold" accessibilityRole="header">
          {t('restaurant.budget', {
            meal: mealLabel,
            kcal: formatNumber(result.budget.kcal),
            protein: result.budget.proteinG,
          })}
        </Text>
        {result.dishes.map((dish, i) => (
          <DishCard
            key={`${dish.name}-${i}`}
            dish={dish}
            best={i === bestIndex}
            mealLabel={mealLabel}
            logging={save.isPending && save.variables?.name === dish.name}
            logged={logged === dish.name}
            onLog={() => logDish(dish)}
          />
        ))}
        <FormMessage message={save.isError ? t('restaurant.saveFailed') : undefined} />
        <Text variant="caption" tone="muted" className="text-center">
          {t('restaurant.note')}
        </Text>
        {again}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
        <View style={{ width: MIN_TOUCH_TARGET }} />
        <Text variant="heading" accessibilityRole="header">
          🍽️ {t('restaurant.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('restaurant.close')}
          onPress={close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
          {body()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
