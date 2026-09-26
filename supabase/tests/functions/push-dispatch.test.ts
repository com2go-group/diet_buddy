import {
  buildMessages,
  handlePushDispatch,
  type DispatchDeps,
  type PendingNotification,
} from '../../functions/push-dispatch/handler';

const A = 'user-a';
const B = 'user-b';
const n = (id: string, user: string, type: string): PendingNotification => ({
  id,
  user_id: user,
  type,
  title: `t-${id}`,
  body: 'b',
});
const prefs = (user: string, over = {}) => ({
  user_id: user,
  streaks: true,
  achievements: true,
  weekly_report: true,
  promotions: false,
  ...over,
});

describe('push rules', () => {
  it('sends to every device of users whose preference allows the type', () => {
    const messages = buildMessages(
      [n('1', A, 'achievement'), n('2', B, 'streak'), n('3', A, 'other')],
      [
        { user_id: A, token: 'tA1' },
        { user_id: A, token: 'tA2' },
        { user_id: B, token: 'tB' },
      ],
      [prefs(A), prefs(B, { streaks: false })],
      [],
    );
    expect(messages.map((m) => [m.to, m.data.notificationId])).toEqual([
      ['tA1', '1'],
      ['tA2', '1'],
    ]);
    expect(messages[0]).toMatchObject({ title: 't-1', body: 'b', sound: 'default' });
  });

  it('uses defaults for users without preferences, and needs marketing consent for promotions', () => {
    const tokens = [{ user_id: A, token: 'tA' }];
    expect(buildMessages([n('1', A, 'weekly_report')], tokens, [], [])).toHaveLength(1);
    expect(
      buildMessages([n('2', A, 'promotion')], tokens, [prefs(A, { promotions: true })], []),
    ).toHaveLength(0);
    expect(
      buildMessages([n('3', A, 'promotion')], tokens, [prefs(A, { promotions: true })], [A]),
    ).toHaveLength(1);
  });
});

describe('push-dispatch handler', () => {
  const deps = (): DispatchDeps & { marked: string[]; removed: string[] } => {
    const marked: string[] = [];
    const removed: string[] = [];
    return {
      marked,
      removed,
      secret: 'cron',
      store: {
        pending: async () => [n('1', A, 'achievement'), n('2', A, 'streak')],
        tokens: async () => [
          { user_id: A, token: 'live' },
          { user_id: A, token: 'dead' },
        ],
        preferences: async () => [],
        marketingConsent: async () => [],
        markPushed: async (ids) => void marked.push(...ids),
        removeTokens: async (t) => void removed.push(...t),
      },
      send: async (messages) =>
        messages.map((m) =>
          m.to === 'dead'
            ? { status: 'error' as const, details: { error: 'DeviceNotRegistered' } }
            : { status: 'ok' as const },
        ),
    };
  };
  const post = (auth = 'Bearer cron') =>
    new Request('http://x', { method: 'POST', headers: { Authorization: auth } });

  it('sends, removes unregistered devices and marks everything pushed', async () => {
    const d = deps();
    const res = await handlePushDispatch(post(), d);
    expect(await res.json()).toEqual({ ok: true, notifications: 2, sent: 2, removedTokens: 2 });
    expect(d.removed).toEqual(['dead', 'dead']);
    expect(d.marked).toEqual(['1', '2']);
  });

  it('only runs for the scheduler', async () => {
    const d = deps();
    expect((await handlePushDispatch(post('Bearer nope'), d)).status).toBe(401);
    expect(d.marked).toEqual([]);
  });
});
