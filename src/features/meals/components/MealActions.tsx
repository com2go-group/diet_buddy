import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components';
import { t } from '@/i18n';

import type { MealSlot } from '../types';
import { CopyYesterday } from './CopyYesterday';

/**
 * What the user can do with the meal that's up next: one main action ("I ate this") and a
 * folded "Change" menu with the rest (another idea, their own meal, yesterday's meal, skip).
 * Any of them moves the plan on to the next meal.
 */
export function MealActions({
  day,
  slot,
  title,
  logging,
  asking,
  skipping,
  onAte,
  onAnother,
  onOwn,
  onSkip,
}: {
  day: Date;
  slot: MealSlot;
  title: string;
  logging: boolean;
  asking: boolean;
  skipping: boolean;
  onAte: () => void;
  onAnother: () => void;
  onOwn: () => void;
  onSkip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const busy = logging || asking || skipping;
  return (
    <View className="mt-1 gap-2">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label={t('mealPlan.ateThis')}
            accessibilityLabel={t('mealPlan.ateItem', { name: title })}
            size="md"
            loading={logging}
            disabled={busy}
            onPress={onAte}
          />
        </View>
        <Button
          label={t('mealPlan.change')}
          accessibilityLabel={t('mealPlan.changeA11y', { slot: t(`homeScreen.${slot}`) })}
          aria-expanded={open}
          variant="outline"
          size="md"
          fullWidth={false}
          disabled={logging}
          onPress={() => setOpen((o) => !o)}
        />
      </View>
      {open ? (
        <View className="gap-2">
          <Button
            label={asking ? t('mealPlan.anotherLoading') : t('mealPlan.anotherIdea')}
            variant="outline"
            size="md"
            loading={asking}
            disabled={busy}
            onPress={onAnother}
          />
          <Button
            label={t('mealPlan.ateOther')}
            variant="outline"
            size="md"
            disabled={busy}
            onPress={onOwn}
          />
          <CopyYesterday day={day} slot={slot} />
          <Button
            label={t('mealPlan.skip')}
            variant="ghost"
            size="md"
            loading={skipping}
            disabled={busy}
            onPress={onSkip}
          />
        </View>
      ) : null}
    </View>
  );
}
