import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import type { FoodLog, MealSlot } from '../types';
import { CopyYesterday } from './CopyYesterday';
import { FoodLogRow } from './FoodLogRow';

/**
 * What was eaten for a meal, inside its card, with a way to add more. An empty meal offers
 * "Same as yesterday" and adding food.
 */
export function SlotLogs({
  day,
  slot,
  logs,
  target,
  onAdd,
  onDelete,
}: {
  day: Date;
  slot: MealSlot;
  logs: FoodLog[];
  target: number | null;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  if (!logs.length) {
    return (
      <View className="gap-2">
        <Text tone="muted" className="text-[14px]">
          {t('meals.empty')}
          {target === null ? '' : ` · ${t('meals.emptyTarget', { target: formatNumber(target) })}`}
        </Text>
        <CopyYesterday day={day} slot={slot} />
        <Button
          label={t('meals.addFood')}
          accessibilityLabel={t('meals.addTo', { slot: t(`homeScreen.${slot}`) })}
          variant="outline"
          size="md"
          onPress={onAdd}
        />
      </View>
    );
  }
  return (
    <View className="gap-2">
      {logs.map((log) => (
        <FoodLogRow key={log.id} log={log} onDelete={() => onDelete(log.id)} />
      ))}
      <Button
        label={t('meals.addFood')}
        accessibilityLabel={t('meals.addTo', { slot: t(`homeScreen.${slot}`) })}
        variant="ghost"
        size="md"
        onPress={onAdd}
      />
    </View>
  );
}
