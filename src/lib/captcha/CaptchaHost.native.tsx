import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Text } from '@/components';
import { getLanguage, t } from '@/i18n';
import { useTheme } from '@/theme';

import {
  CAPTCHA_ORIGIN,
  CaptchaError,
  captchaEnabled,
  captchaHtml,
  captchaSiteKey,
  createTokenQueue,
  parseCaptchaMessage,
  registerCaptcha,
} from './captcha';

/**
 * Turnstile in a small web view. Invisible unless Cloudflare wants the person to interact; then
 * it appears as a card at the bottom of the screen until the check passes.
 */
export function CaptchaHost() {
  const { scheme } = useTheme();
  const view = useRef<WebView>(null);
  const queue = useRef(createTokenQueue());
  const ready = useRef(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    if (!captchaEnabled) return;
    return registerCaptcha(() => {
      const token = queue.current.wait();
      if (ready.current) view.current?.injectJavaScript('window.runCaptcha(); true;');
      return token;
    });
  }, []);

  if (!captchaEnabled) return null;

  const onMessage = (e: WebViewMessageEvent) => {
    const m = parseCaptchaMessage(e.nativeEvent.data);
    if (!m) return;
    if (m.type === 'ready') {
      ready.current = true;
      if (queue.current.pending) view.current?.injectJavaScript('window.runCaptcha(); true;');
    } else if (m.type === 'token') {
      setInteractive(false);
      queue.current.resolve(m.token);
    } else if (m.type === 'error') {
      setInteractive(false);
      queue.current.reject(new CaptchaError());
    } else {
      setInteractive(m.on);
    }
  };

  return (
    <View
      pointerEvents={interactive ? 'auto' : 'none'}
      style={
        interactive
          ? { position: 'absolute', left: 16, right: 16, bottom: 32 }
          : { position: 'absolute', width: 1, height: 1, opacity: 0 }
      }
    >
      {interactive ? (
        <View className="rounded-2xl bg-card p-3 shadow-md">
          <Text variant="label" className="mb-2 font-semibold">
            {t('auth.captchaTitle')}
          </Text>
        </View>
      ) : null}
      <WebView
        ref={view}
        originWhitelist={['*']}
        source={{
          html: captchaHtml(captchaSiteKey, scheme, getLanguage()),
          baseUrl: CAPTCHA_ORIGIN,
        }}
        onMessage={onMessage}
        onError={() => queue.current.reject(new CaptchaError())}
        style={{ height: interactive ? 80 : 1, backgroundColor: 'transparent' }}
        javaScriptEnabled
        accessibilityLabel={t('auth.captchaTitle')}
      />
    </View>
  );
}
