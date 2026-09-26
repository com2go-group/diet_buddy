import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components';
import { useTheme } from '@/theme';

function Dot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withDelay(delay, withRepeat(withTiming(-4, { duration: 300 }), -1, true));
  }, [delay, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mutedForeground },
        style,
      ]}
    />
  );
}

export function TypingIndicator({ avatar, label }: { avatar: string; label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      className="mb-3 flex-row items-center gap-2"
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
        <Text className="text-base leading-5">{avatar}</Text>
      </View>
      <View className="flex-row gap-1.5 rounded-2xl border border-border bg-card px-4 py-3.5">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}
