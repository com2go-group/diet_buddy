import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, motion } from '@/theme';

import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet that slides up with a spring over a dimmed backdrop (CLAUDE.md §5). */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(height);
  const backdrop = useSharedValue(0);

  // Mount immediately on open (state adjusted during render); unmount after the exit animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.value = reduceMotion ? 0 : withSpring(0, motion.spring);
      backdrop.value = withTiming(1, { duration: motion.fast });
      return;
    }
    translateY.value = withTiming(height, { duration: motion.fast });
    backdrop.value = withTiming(0, { duration: motion.fast });
    const timer = setTimeout(() => setMounted(false), motion.fast);
    return () => clearTimeout(timer);
  }, [visible, height, reduceMotion, translateY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.5 }));

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Animated.View
          style={[{ position: 'absolute', inset: 0, backgroundColor: '#000' }, backdropStyle]}
        >
          <Pressable
            className="flex-1"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>
        {/* NativeWind styles plain Views only, so classes go on the inner View. */}
        <Animated.View accessibilityViewIsModal style={sheetStyle}>
          <View
            style={{ maxHeight: height * 0.92, paddingBottom: insets.bottom + 16 }}
            className="rounded-t-2xl bg-background px-5 pt-3"
          >
            <View className="mb-2 h-1.5 w-10 self-center rounded-full bg-muted-foreground/30" />
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="heading" accessibilityRole="header" className="flex-1">
                {title ?? ''}
              </Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
                className="items-center justify-center"
              >
                <Text variant="heading" tone="muted">
                  ✕
                </Text>
              </Pressable>
            </View>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
