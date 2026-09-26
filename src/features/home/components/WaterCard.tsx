import { Pressable, View } from 'react-native';

import { Ring, Text } from '@/components';
import { t } from '@/i18n';
import { ACCENTS, accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import { GLASS_ML } from '../summary';

/**
 * Hydration ring plus one button per 250 ml glass. Tapping the next empty glass logs one;
 * tapping a filled glass removes the most recent one.
 */
export function WaterCard({
  waterMl,
  targetMl,
  onAdd,
  onRemove,
  failed,
}: {
  waterMl: number;
  targetMl: number;
  onAdd: () => void;
  onRemove: (() => void) | null;
  failed: boolean;
}) {
  const { scheme } = useTheme();
  const cyan = accentColor('cyan', scheme);
  const glasses = Math.min(16, Math.ceil(targetMl / GLASS_ML));
  const filled = Math.floor(waterMl / GLASS_ML);
  const litres = (ml: number) => (ml / 1000).toFixed(1);

  return (
    <View className="mb-4 gap-2 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-4">
        <Ring
          value={waterMl}
          max={targetMl}
          size={88}
          strokeWidth={7}
          color={ACCENTS.cyan.dark}
          label={t('homeScreen.hydration')}
        >
          <Text className="text-sm leading-4">💧</Text>
          <Text variant="caption" className="font-bold" style={{ color: cyan }}>
            {litres(waterMl)}L
          </Text>
        </Ring>
        <View className="flex-1">
          <Text variant="label" className="font-bold text-[15px]">
            {t('homeScreen.hydration')}
          </Text>
          <Text variant="caption" tone="muted" className="mt-0.5 text-[13px]">
            {t('homeScreen.hydrationOf', { current: litres(waterMl), target: litres(targetMl) })}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {Array.from({ length: glasses }, (_, i) => {
          const isFilled = i < filled;
          const action = isFilled ? onRemove : onAdd;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={isFilled ? t('homeScreen.removeGlass') : t('homeScreen.addGlass')}
              aria-disabled={!action}
              disabled={!action}
              onPress={action ?? undefined}
              style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
              className={`items-center justify-center rounded-lg active:opacity-70 ${isFilled ? 'bg-water' : 'border border-water/40 bg-water/10'}`}
            >
              <Text className="text-sm">{isFilled ? '💧' : '＋'}</Text>
            </Pressable>
          );
        })}
      </View>
      <FormMessage message={failed ? t('homeScreen.waterFailed') : undefined} />
    </View>
  );
}
