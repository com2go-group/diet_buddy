import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl, Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { BrandMark } from '../components/BrandMark';
import { Divider, FormMessage } from '../components/FormMessage';
import { SignInForm } from '../components/SignInForm';
import { SignUpForm } from '../components/SignUpForm';
import { SocialButtons } from '../components/SocialButtons';
import { authConfig } from '../config';
import { useSocialSignIn } from '../hooks/useSocialSignIn';
import type { AuthMethod } from '../schemas';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'signin');
  const [method, setMethod] = useState<AuthMethod>('email');
  const social = useSocialSignIn();
  const { colors } = useTheme();
  const isSignUp = mode === 'signup';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
            accessibilityRole="button"
            accessibilityLabel={t('auth.back')}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
            className="items-center justify-center rounded-full bg-muted"
          >
            <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
          </Pressable>
          <SegmentedControl
            className="flex-1"
            accessibilityLabel={`${t('auth.signIn')} / ${t('auth.signUp')}`}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'signin', label: t('auth.signIn') },
              { value: 'signup', label: t('auth.signUp') },
            ]}
          />
        </View>
        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <BrandMark />
          <View className="gap-1">
            <Text variant="title" accessibilityRole="header">
              {isSignUp ? t('auth.signUpTitle') : t('auth.signInTitle')}
            </Text>
            <Text tone="muted">
              {isSignUp ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
            </Text>
          </View>

          <SocialButtons {...social} />
          <FormMessage message={social.error ? t(social.error) : undefined} />
          {social.apple || social.google ? (
            <Divider
              label={
                method === 'email' ? t('auth.orContinueWithEmail') : t('auth.orContinueWithPhone')
              }
            />
          ) : null}

          {authConfig.phoneEnabled ? (
            <SegmentedControl
              accessibilityLabel={`${t('auth.methodEmail')} / ${t('auth.methodPhone')}`}
              value={method}
              onChange={setMethod}
              options={[
                { value: 'email', label: t('auth.methodEmail') },
                { value: 'phone', label: t('auth.methodPhone') },
              ]}
            />
          ) : null}

          {isSignUp ? <SignUpForm method={method} /> : <SignInForm method={method} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
