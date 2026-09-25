import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme';

import { GradientFill } from './GradientFill';

/** Thin gradient progress bar (0–1). Announced as a progress bar with the given label. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  const width = useSharedValue(clamped);
  useEffect(() => {
    width.value = reduceMotion ? clamped : withTiming(clamped, { duration: motion.base });
  }, [clamped, reduceMotion, width]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(width.value, 0.04) * 100}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, style]}>
        <GradientFill id="progress" />
      </Animated.View>
    </View>
  );
}
