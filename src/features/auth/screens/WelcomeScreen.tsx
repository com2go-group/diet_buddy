import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET } from '@/theme';

import { BrandMark } from '../components/BrandMark';

// The welcome screen is always dark, as in the prototype, regardless of the app theme.
const BG = '#0F172A';
const FEATURES = [
  { icon: '🧠', key: 'welcome.featurePlans' },
  { icon: '📊', key: 'welcome.featureTracking' },
  { icon: '🏆', key: 'welcome.featureProgress' },
] as const;

function Glow() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="10%" cy="5%" r="200" fill="url(#glow)" />
      <Circle cx="100%" cy="70%" r="170" fill="url(#glow)" />
    </Svg>
  );
}

export function WelcomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <Glow />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 justify-center px-8">
          <Animated.View entering={FadeInDown.duration(500)}>
            <BrandMark size="lg" inverse />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <Text className="mb-10 mt-3 text-center" style={{ color: '#94A3B8', lineHeight: 26 }}>
              {t('welcome.tagline')}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <View className="mb-10 gap-3">
              <Button
                label={t('welcome.getStarted')}
                onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })}
                style={{
                  minHeight: MIN_TOUCH_TARGET + 12,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                className="items-center justify-center rounded-lg border active:opacity-80"
              >
                <Text variant="heading" className="font-medium" style={{ color: '#CBD5E1' }}>
                  {t('welcome.haveAccount')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
          <View className="gap-3">
            {FEATURES.map((feature, i) => (
              <Animated.View
                key={feature.key}
                entering={FadeInDown.delay(400 + i * 80).duration(350)}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <Text accessibilityElementsHidden importantForAccessibility="no">
                    {feature.icon}
                  </Text>
                  <Text variant="label" className="font-medium" style={{ color: '#CBD5E1' }}>
                    {t(feature.key)}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
        <Animated.View entering={FadeIn.delay(700)}>
          <Text variant="caption" className="px-8 pb-6 text-center" style={{ color: '#64748B' }}>
            {t('welcome.finePrint')}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
