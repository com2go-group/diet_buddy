import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { t } from '@/i18n';
import { motion, trackColor, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingProps {
  /** Current value; progress is value / max, clamped to 0–1 for drawing. */
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  /** Color used once value exceeds max, e.g. over the calorie target. */
  overColor?: string;
  /** Spoken label, e.g. "Calories". */
  label: string;
  children?: ReactNode;
}

/** Circular progress ring for calories, macros and hydration. */
export function Ring({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color,
  overColor,
  label,
  children,
}: RingProps) {
  const { scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? value / max : 0;
  const clamped = Math.min(1, Math.max(0, ratio));

  const progress = useSharedValue(reduceMotion ? clamped : 0);
  useEffect(() => {
    progress.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: motion.slow, easing: Easing.out(Easing.cubic) });
  }, [clamped, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('a11y.progress', {
        label,
        value: Math.round(value),
        max: Math.round(max),
      })}
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor[scheme]}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ratio > 1 && overColor ? overColor : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}
