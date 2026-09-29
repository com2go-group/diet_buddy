import { Button } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import { FormMessage } from '../../auth/components/FormMessage';
import { copyOfMeal, previousDay } from '../copyYesterday';
import type { MealSlot } from '../types';
import { useLogFoods, useMealsDay } from '../useMeals';

/** "Same as yesterday" for an empty meal: logs yesterday's foods for it again in one tap. */
export function CopyYesterday({ day, slot }: { day: Date; slot: MealSlot }) {
  const yesterday = useMealsDay(previousDay(day)).query;
  const save = useLogFoods();
  const entries = yesterday.data ? copyOfMeal(yesterday.data.logs, slot, day, new Date()) : [];
  if (!entries.length) return null;
  const kcal = entries.reduce((sum, e) => sum + e.macros.kcal, 0);
  return (
    <>
      <Button
        label={t('meals.sameAsYesterday', {
          count: entries.length,
          kcal: formatNumber(Math.round(kcal)),
        })}
        variant="outline"
        size="md"
        loading={save.isPending}
        onPress={() => save.mutate(entries)}
      />
      <FormMessage message={save.isError ? t('meals.copyFailed') : undefined} />
    </>
  );
}
