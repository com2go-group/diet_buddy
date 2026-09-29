import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { getLanguage } from '@/i18n';
import { useTheme } from '@/theme';

import { CaptchaError, captchaEnabled, captchaSiteKey, registerCaptcha } from './captcha';

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  execute(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new CaptchaError()));
    s.onerror = () => {
      loading = null;
      reject(new CaptchaError());
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Web build: Turnstile rendered straight into the page; shows itself only when needed. */
export function CaptchaHost() {
  const { scheme } = useTheme();
  const box = useRef<View>(null);
  useEffect(() => {
    if (!captchaEnabled) return;
    let widget: string | null = null;
    let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;
    const unregister = registerCaptcha(async () => {
      const ts = await loadTurnstile();
      const el = box.current as unknown as HTMLElement | null;
      if (!el) throw new CaptchaError('captcha_unavailable');
      const token = new Promise<string>((resolve, reject) => (pending = { resolve, reject }));
      if (widget === null) {
        widget = ts.render(el, {
          sitekey: captchaSiteKey,
          theme: scheme,
          language: getLanguage(),
          execution: 'execute',
          appearance: 'interaction-only',
          callback: (t: string) => pending?.resolve(t),
          'error-callback': () => {
            pending?.reject(new CaptchaError());
            return true;
          },
        });
      } else {
        ts.reset(widget);
      }
      ts.execute(widget);
      return token;
    });
    return unregister;
  }, [scheme]);
  if (!captchaEnabled) return null;
  return <View ref={box} className="items-center" />;
}
