import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { t } from '@/i18n';

import { cn } from './cn';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Tailwind rounding class, e.g. 'rounded-full' for avatars and rings. */
  className?: string;
}

/** Pulsing placeholder for loading states. Static when the user prefers reduced motion. */
export function Skeleton({ width = '100%', height = 16, className }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height }, style]}
    >
      {/* NativeWind styles plain Views only, so classes go on the inner View. */}
      <View className={cn('flex-1 rounded-md bg-muted', className)} />
    </Animated.View>
  );
}

/** A card-shaped group of skeleton lines, the default loading state for a data screen section. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      className="gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <Skeleton width="40%" height={14} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} />
      ))}
    </View>
  );
}
