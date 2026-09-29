import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

/**
 * Product analytics with PostHog's HTTP API (EU cloud by default), only with the user's
 * `analytics` consent (Privacy & Data). Events describe what was used (e.g. "paywall_viewed",
 * "meal_logged" with its source), never health values, food names or anything typed. The ID is
 * a random one for this install, not the account; it's replaced on sign-out.
 */
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com').replace(
  /\/$/,
  '',
);
const ID_KEY = 'analytics-id';
const FLUSH_MS = 15_000;
const MAX_QUEUE = 100;

export type EventProps = Record<string, string | number | boolean | null>;
type Queued = { event: string; properties: EventProps; timestamp: string };

let enabled = false;
let distinctId: string | null = null;
let queue: Queued[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

const randomId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

async function id(): Promise<string> {
  if (distinctId) return distinctId;
  distinctId = (await AsyncStorage.getItem(ID_KEY).catch(() => null)) ?? randomId();
  await AsyncStorage.setItem(ID_KEY, distinctId).catch(() => undefined);
  return distinctId;
}

export const analyticsAvailable = () => Boolean(KEY);

/** Turns sending on or off (follows the analytics consent). Off drops anything not yet sent. */
export function setAnalyticsEnabled(on: boolean): void {
  enabled = on && Boolean(KEY);
  if (!enabled) {
    queue = [];
    if (timer) clearInterval(timer);
    timer = null;
    return;
  }
  if (!timer) {
    timer = setInterval(() => void flushAnalytics(), FLUSH_MS);
    AppState.addEventListener('change', (s) => s !== 'active' && void flushAnalytics());
  }
}

export function track(event: string, properties: EventProps = {}): void {
  if (!enabled) return;
  queue.push({ event, properties, timestamp: new Date().toISOString() });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
}

export async function flushAnalytics(fetcher: typeof fetch = fetch): Promise<void> {
  if (!enabled || queue.length === 0) return;
  const batch = queue;
  queue = [];
  const distinct_id = await id();
  const common = {
    $lib: 'dietbuddy-app',
    $os: Platform.OS,
    $app_version: Constants.expoConfig?.version ?? null,
  };
  try {
    await fetcher(`${HOST}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: KEY,
        batch: batch.map((e) => ({
          event: e.event,
          timestamp: e.timestamp,
          properties: { ...common, ...e.properties, distinct_id },
        })),
      }),
    });
  } catch {
    // Analytics are best effort; nothing is retried or stored.
  }
}

/** A new random ID after sign-out, so two accounts on one phone aren't linked. */
export async function resetAnalyticsId(): Promise<void> {
  distinctId = null;
  queue = [];
  await AsyncStorage.removeItem(ID_KEY).catch(() => undefined);
}
