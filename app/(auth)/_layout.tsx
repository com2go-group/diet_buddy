import { Stack } from 'expo-router';
import { View } from 'react-native';

import { CaptchaHost } from '@/lib/captcha';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      {/* Bot check for sign-up, sign-in and codes (off until a Turnstile site key is set). */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <CaptchaHost />
      </View>
    </View>
  );
}
