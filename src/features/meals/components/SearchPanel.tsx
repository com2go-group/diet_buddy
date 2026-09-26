import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, ErrorState, SkeletonCard, Text, TextField } from '@/components';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

import { FoodSearchError } from '../api';
import type { FoodResult, PortionFood } from '../types';
import { useFoodSearch, useRecentFoods } from '../useMeals';
import { useFeature } from '../../config';
import { BarcodeScanner } from './BarcodeScanner';
import { FoodList } from './FoodList';

const toPortionFood = (f: FoodResult): PortionFood => ({
  kind: 'per100g',
  ref: f.ref,
  name: f.name,
  brand: f.brand,
  per100g: {
    kcal: f.per100g.kcal,
    proteinG: f.per100g.proteinG,
    carbsG: f.per100g.carbsG,
    fatG: f.per100g.fatG,
  },
  servings: f.servings,
});

/** USDA search (or a barcode from Open Food Facts), or recent foods while the box is empty. */
export function SearchPanel({ onPick }: { onPick: (food: PortionFood) => void }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const barcodeOn = useFeature('barcode');
  const search = useFoodSearch(text);
  const recent = useRecentFoods();

  const results = () => {
    if (search.pending) return <SkeletonCard lines={4} />;
    if (search.isError) {
      const notConfigured =
        search.error instanceof FoodSearchError && search.error.code === 'not_configured';
      return notConfigured ? (
        <EmptyState
          emoji="🔌"
          title={t('logFood.searchFailed')}
          message={t('logFood.searchNotConfigured')}
        />
      ) : (
        <ErrorState message={t('logFood.searchFailed')} onRetry={() => search.refetch()} />
      );
    }
    if (!search.data?.length) {
      return (
        <EmptyState
          emoji="🔍"
          title={t('logFood.noResults')}
          message={t('logFood.noResultsDesc')}
        />
      );
    }
    return (
      <>
        <FoodList foods={search.data.map(toPortionFood)} onPick={onPick} />
        <Text variant="caption" tone="muted" className="mt-2 text-center">
          {t('logFood.source')}
        </Text>
      </>
    );
  };

  const recentList = () => {
    if (recent.isPending) return <SkeletonCard lines={3} />;
    if (recent.isError) return <ErrorState onRetry={() => recent.refetch()} />;
    if (!recent.data.length) {
      return (
        <Text tone="muted" className="text-[13px]">
          {t('logFood.recentEmpty')}
        </Text>
      );
    }
    return <FoodList foods={recent.data} onPick={onPick} />;
  };

  return (
    <View className="gap-4">
      <TextField
        label={t('logFood.searchLabel')}
        placeholder={t('logFood.searchPlaceholder')}
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        returnKeyType="search"
        hint={t('logFood.searchHint')}
        trailing={
          <Feather
            name="search"
            size={16}
            color={colors.mutedForeground}
            style={{ paddingRight: 12 }}
          />
        }
      />
      {barcodeOn ? (
        <Button
          label={`▦ ${t('logFood.scanBarcode')}`}
          variant="outline"
          size="md"
          onPress={() => setScanning(true)}
        />
      ) : null}
      {scanning ? (
        <BarcodeScanner
          visible
          onClose={() => setScanning(false)}
          onFound={(food) => onPick(toPortionFood(food))}
        />
      ) : null}
      {search.enabled ? (
        results()
      ) : (
        <View className="gap-2">
          <Text variant="label" accessibilityRole="header" className="font-bold">
            {t('logFood.recent')}
          </Text>
          {recentList()}
        </View>
      )}
    </View>
  );
}
