import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { GradientFill, Text } from '@/components';

const wordmark = {
  lg: 'text-[40px] leading-[48px] tracking-tight',
  sm: 'text-[21px] leading-7 tracking-tight',
} as const;

/** Gradient bolt tile plus "DietBuddy" wordmark, as in the prototype. */
export function BrandMark({
  size = 'sm',
  inverse = false,
}: {
  size?: 'sm' | 'lg';
  inverse?: boolean;
}) {
  const tile = size === 'lg' ? 80 : 40;
  return (
    <View
      className={size === 'lg' ? 'items-center gap-6' : 'flex-row items-center gap-2.5'}
      accessible
      accessibilityRole="header"
      accessibilityLabel="DietBuddy"
    >
      <View
        style={{ width: tile, height: tile, borderRadius: size === 'lg' ? 22 : 14 }}
        className="items-center justify-center overflow-hidden"
      >
        <GradientFill id={`brand-${size}`} />
        <Feather name="zap" size={tile / 2} color="#FFFFFF" />
      </View>
      {/* Two sibling Texts, not nested: a nested Text would reset to the body size. */}
      <View
        className="flex-row"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          variant="display"
          className={wordmark[size]}
          style={inverse ? { color: '#FFFFFF' } : undefined}
        >
          Diet
        </Text>
        <Text variant="display" tone="primary" className={wordmark[size]}>
          Buddy
        </Text>
      </View>
    </View>
  );
}
