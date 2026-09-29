/**
 * Bot protection for sign-up, sign-in, code resends and password resets (Cloudflare Turnstile,
 * checked by Supabase Auth). Off until EXPO_PUBLIC_TURNSTILE_SITE_KEY is set; then the auth
 * screens mount <CaptchaHost />, which registers how to get a fresh single-use token.
 */

export const captchaSiteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '';
export const captchaEnabled = Boolean(captchaSiteKey);

/** Turnstile checks the page's hostname: the widget runs as if on the website. */
export const CAPTCHA_ORIGIN = 'https://dietbuddy.me';

export const CAPTCHA_TIMEOUT_MS = 30_000;

export class CaptchaError extends Error {
  constructor(message = 'captcha_failed') {
    super(message);
    this.name = 'CaptchaError';
  }
}

type Requester = () => Promise<string>;
let requester: Requester | null = null;

/** Called by the mounted widget; returns the unregister function. */
export function registerCaptcha(fn: Requester): () => void {
  requester = fn;
  return () => {
    if (requester === fn) requester = null;
  };
}

/**
 * A fresh token for one auth request, or undefined when CAPTCHA is off. Fails (CaptchaError)
 * when the widget isn't mounted, errors or takes too long, so the caller can show a retry.
 */
export async function captchaToken(): Promise<string | undefined> {
  if (!captchaEnabled) return undefined;
  if (!requester) throw new CaptchaError('captcha_unavailable');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      requester(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new CaptchaError('captcha_timeout')), CAPTCHA_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** One request at a time: waiters are settled by the widget's messages. */
export function createTokenQueue() {
  let waiting: { resolve: (t: string) => void; reject: (e: Error) => void }[] = [];
  return {
    wait(): Promise<string> {
      return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
    },
    get pending() {
      return waiting.length;
    },
    resolve(token: string) {
      const w = waiting;
      waiting = [];
      w.forEach((x) => x.resolve(token));
    },
    reject(error: Error) {
      const w = waiting;
      waiting = [];
      w.forEach((x) => x.reject(error));
    },
  };
}

export type CaptchaMessage =
  | { type: 'ready' }
  | { type: 'token'; token: string }
  | { type: 'error' }
  | { type: 'interactive'; on: boolean };

export function parseCaptchaMessage(raw: string): CaptchaMessage | null {
  try {
    const m = JSON.parse(raw) as Partial<CaptchaMessage> & Record<string, unknown>;
    if (m.type === 'ready' || m.type === 'error') return { type: m.type };
    if (m.type === 'token' && typeof m.token === 'string' && m.token) {
      return { type: 'token', token: m.token };
    }
    if (m.type === 'interactive') return { type: 'interactive', on: m.on === true };
  } catch {
    // ignore
  }
  return null;
}

/** The page the phone's hidden web view loads (the web build uses the same script directly). */
export function captchaHtml(siteKey: string, theme: 'light' | 'dark', language: string): string {
  const config = JSON.stringify({ sitekey: siteKey, theme, language });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstile&render=explicit" async defer></script>
</head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:transparent">
<div id="w"></div>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
var id=null;
function onTurnstile(){
  var c=${config};
  id=turnstile.render('#w',Object.assign(c,{execution:'execute',appearance:'interaction-only',
    callback:function(t){send({type:'token',token:t});},
    'error-callback':function(){send({type:'error'});return true;},
    'before-interactive-callback':function(){send({type:'interactive',on:true});},
    'after-interactive-callback':function(){send({type:'interactive',on:false});}}));
  send({type:'ready'});
}
window.runCaptcha=function(){if(id===null){send({type:'error'});return;}turnstile.reset(id);turnstile.execute(id);};
</script></body></html>`;
}
