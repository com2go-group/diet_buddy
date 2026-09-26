import { fail, json } from '../_shared/http.ts';

/**
 * Sends server-created notifications (achievements, streaks, weekly report, promotions) as push
 * messages through Expo's push service, honouring each user's preferences (CLAUDE.md §7.13).
 * Run every few minutes by pg_cron (docs/setup/push.md). Every processed notification is marked
 * pushed, sent or not, so nothing is retried forever; it stays in the in-app list either way.
 */

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PendingNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
}

export interface Preferences {
  streaks: boolean;
  achievements: boolean;
  weekly_report: boolean;
  promotions: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  streaks: true,
  achievements: true,
  weekly_report: true,
  promotions: false,
};

const PREF_FOR_TYPE: Record<string, keyof Preferences> = {
  achievement: 'achievements',
  streak: 'streaks',
  weekly_report: 'weekly_report',
  promotion: 'promotions',
};

export interface PushMessage {
  to: string;
  title: string;
  body?: string;
  sound: 'default';
  data: { notificationId: string; type: string };
}

export interface DispatchStore {
  pending(limit: number): Promise<PendingNotification[]>;
  tokens(userIds: string[]): Promise<{ user_id: string; token: string }[]>;
  preferences(userIds: string[]): Promise<({ user_id: string } & Preferences)[]>;
  /** Users who granted marketing consent (required for promotions). */
  marketingConsent(userIds: string[]): Promise<string[]>;
  markPushed(ids: string[]): Promise<void>;
  removeTokens(tokens: string[]): Promise<void>;
}

export interface DispatchDeps {
  secret: string | undefined;
  store: DispatchStore;
  /** Sends up to 100 messages; returns one ticket per message, in order. */
  send(
    messages: PushMessage[],
  ): Promise<{ status: 'ok' | 'error'; details?: { error?: string } }[]>;
}

/** Which messages to send for these notifications. Pure, so the rules are easy to test. */
export function buildMessages(
  notifications: PendingNotification[],
  tokens: { user_id: string; token: string }[],
  prefs: ({ user_id: string } & Preferences)[],
  marketing: string[],
): PushMessage[] {
  const messages: PushMessage[] = [];
  for (const n of notifications) {
    const pref = PREF_FOR_TYPE[n.type];
    if (!pref) continue;
    const p = prefs.find((x) => x.user_id === n.user_id) ?? DEFAULT_PREFERENCES;
    if (!p[pref]) continue;
    if (pref === 'promotions' && !marketing.includes(n.user_id)) continue;
    for (const t of tokens.filter((x) => x.user_id === n.user_id)) {
      messages.push({
        to: t.token,
        title: n.title,
        ...(n.body ? { body: n.body } : {}),
        sound: 'default',
        data: { notificationId: n.id, type: n.type },
      });
    }
  }
  return messages;
}

export async function handlePushDispatch(req: Request, deps: DispatchDeps): Promise<Response> {
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.secret || req.headers.get('Authorization') !== `Bearer ${deps.secret}`) {
    return fail('unauthorized', 401);
  }
  try {
    const { store } = deps;
    const pending = await store.pending(500);
    if (!pending.length) return json({ ok: true, notifications: 0, sent: 0 });
    const users = [...new Set(pending.map((n) => n.user_id))];
    const [tokens, prefs, marketing] = await Promise.all([
      store.tokens(users),
      store.preferences(users),
      store.marketingConsent(users),
    ]);
    const messages = buildMessages(pending, tokens, prefs, marketing);
    const dead: string[] = [];
    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const tickets = await deps.send(batch);
      tickets.forEach((ticket, j) => {
        if (ticket.status === 'ok') sent++;
        else if (ticket.details?.error === 'DeviceNotRegistered') dead.push(batch[j]!.to);
      });
    }
    if (dead.length) await store.removeTokens(dead);
    await store.markPushed(pending.map((n) => n.id));
    return json({ ok: true, notifications: pending.length, sent, removedTokens: dead.length });
  } catch (e) {
    console.error('push-dispatch failed', e);
    return fail('server_error', 500);
  }
}
