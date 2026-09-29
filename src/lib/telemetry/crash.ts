import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting with Sentry (EU region DSN recommended). Reports carry the error, stack trace,
 * app version and device model only: no user ID, no email, no request bodies, no health data
 * (sendDefaultPii off, user and breadcrumbs data scrubbed in beforeSend). On by default as a
 * legitimate interest in keeping the app working; switchable off in Privacy & Data.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const OPT_OUT_KEY = 'crash-reports-off';

let optedOut = false;

type SentryEvent = Parameters<NonNullable<Sentry.ReactNativeOptions['beforeSend']>>[0];

/** Removes anything that could identify the user or reveal what they logged. */
export function scrub<T extends SentryEvent>(event: T): T | null {
  if (optedOut) return null;
  delete event.user;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
  }
  event.breadcrumbs = (event.breadcrumbs ?? []).map((b) => ({ ...b, data: undefined }));
  return event;
}

export function initCrashReporting(): void {
  if (!DSN || __DEV__) return;
  AsyncStorage.getItem(OPT_OUT_KEY)
    .then((v) => {
      optedOut = v === '1';
    })
    .catch(() => undefined);
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoSessionTracking: true,
    beforeSend: (event) => scrub(event),
  });
}

export const crashReportingAvailable = () => Boolean(DSN);

export async function crashReportsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(OPT_OUT_KEY).catch(() => null)) !== '1';
}

export async function setCrashReportsEnabled(enabled: boolean): Promise<void> {
  optedOut = !enabled;
  await AsyncStorage.setItem(OPT_OUT_KEY, enabled ? '0' : '1');
}
