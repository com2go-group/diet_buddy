import {
  handleAdminUsers,
  type AdminRole,
  type AdminUsersDeps,
} from '../../functions/admin-users/handler';

const ADMIN = '33333333-3333-4333-8333-333333333333';
const USER = '11111111-1111-4111-8111-111111111111';
const STAFF = '22222222-2222-4222-8222-222222222222';

function setup(caller: { role: AdminRole } | null) {
  const calls: string[] = [];
  const deps: AdminUsersDeps = {
    getAdmin: async () => (caller ? { userId: ADMIN, role: caller.role } : null),
    roleOf: async (id) => (id === STAFF ? 'support' : null),
    exportUser: async (id) => ({ account: { id } }),
    removeFiles: async (id) => (calls.push(`files:${id}`), 2),
    deleteUser: async (id) => void calls.push(`delete:${id}`),
    setBanned: async (id, banned) => void calls.push(`${banned ? 'ban' : 'unban'}:${id}`),
    audit: async (_a, action, target) => void calls.push(`audit:${action}:${target}`),
  };
  return { deps, calls };
}

const NOW = new Date('2026-09-29T10:00:00Z');

/** admin-users with RevenueCat answering `entitlements` (the subscriber record after the call). */
function withRevenueCat(
  entitlements: Record<string, { expires_date: string | null }>,
  status = 200,
) {
  const { deps, calls } = setup({ role: 'admin' });
  const audits: { action: string; details?: Record<string, unknown> }[] = [];
  const applied: [string, boolean][] = [];
  const fetchFn = jest.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ subscriber: { entitlements } }), { status }),
  );
  Object.assign(deps, {
    revenueCatKey: 'sk_test',
    fetch: fetchFn as unknown as typeof fetch,
    now: () => NOW,
    applyPremium: async (id: string, premium: boolean) => (applied.push([id, premium]), true),
    audit: async (_a: string, action: string, _t: string, details?: Record<string, unknown>) =>
      void audits.push({ action, details }),
  });
  return { deps, calls, audits, applied, fetchFn };
}

const post = (body: object) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('admin-users', () => {
  it('exports a user for a GDPR request, after writing the audit log', async () => {
    const { deps, calls } = setup({ role: 'admin' });
    const res = await handleAdminUsers(post({ action: 'export', userId: USER }), deps);
    expect(res.status).toBe(200);
    expect((await res.json()).export.account.id).toBe(USER);
    expect(calls).toEqual([`audit:user_export:${USER}`]);
  });

  it('deletes files then the account, only with the ID typed as confirmation', async () => {
    const { deps, calls } = setup({ role: 'admin' });
    expect((await handleAdminUsers(post({ action: 'delete', userId: USER }), deps)).status).toBe(
      400,
    );
    expect(calls).toEqual([]);
    const res = await handleAdminUsers(
      post({ action: 'delete', userId: USER, confirm: USER }),
      deps,
    );
    expect(await res.json()).toEqual({ deleted: true, files: 2 });
    expect(calls).toEqual([`audit:user_delete:${USER}`, `files:${USER}`, `delete:${USER}`]);
  });

  it('bans and unbans', async () => {
    const { deps, calls } = setup({ role: 'admin' });
    await handleAdminUsers(post({ action: 'ban', userId: USER }), deps);
    await handleAdminUsers(post({ action: 'unban', userId: USER }), deps);
    expect(calls.filter((c) => !c.startsWith('audit'))).toEqual([`ban:${USER}`, `unban:${USER}`]);
  });

  it('refuses support staff, non-admins, self-actions and (unless owner) staff targets', async () => {
    expect(
      (
        await handleAdminUsers(
          post({ action: 'export', userId: USER }),
          setup({ role: 'support' }).deps,
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleAdminUsers(post({ action: 'export', userId: USER }), setup(null).deps)).status,
    ).toBe(403);
    expect(
      (
        await handleAdminUsers(
          post({ action: 'ban', userId: ADMIN }),
          setup({ role: 'owner' }).deps,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleAdminUsers(
          post({ action: 'ban', userId: STAFF }),
          setup({ role: 'admin' }).deps,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleAdminUsers(
          post({ action: 'ban', userId: STAFF }),
          setup({ role: 'owner' }).deps,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handleAdminUsers(
          post({ action: 'nuke', userId: USER }),
          setup({ role: 'owner' }).deps,
        )
      ).status,
    ).toBe(400);
  });

  it('grants Premium through RevenueCat for the chosen time, with a reason', async () => {
    const { deps, audits, applied, fetchFn } = withRevenueCat({
      premium: { expires_date: '2026-10-29T10:00:00Z' },
    });
    const res = await handleAdminUsers(
      post({ action: 'grant_premium', userId: USER, duration: 'monthly', reason: 'Beta tester' }),
      deps,
    );
    expect(await res.json()).toEqual({ premium: true, expiresAt: '2026-10-29T10:00:00Z' });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(
      `https://api.revenuecat.com/v1/subscribers/${USER}/entitlements/premium/promotional`,
    );
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ duration: 'monthly' });
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk_test');
    expect(applied).toEqual([[USER, true]]);
    expect(audits).toEqual([
      {
        action: 'grant_premium',
        details: {
          reason: 'Beta tester',
          duration: 'monthly',
          premium: true,
          expires_at: '2026-10-29T10:00:00Z',
        },
      },
    ]);
  });

  it('revokes granted Premium, keeping Premium a user pays for', async () => {
    const { deps, applied, fetchFn } = withRevenueCat({
      premium: { expires_date: '2027-01-01T00:00:00Z' }, // still subscribed in the store
    });
    const res = await handleAdminUsers(
      post({ action: 'revoke_premium', userId: USER, reason: 'Test finished' }),
      deps,
    );
    expect(await res.json()).toEqual({ premium: true, expiresAt: '2027-01-01T00:00:00Z' });
    expect(fetchFn.mock.calls[0]![0]).toMatch(/\/entitlements\/premium\/revoke_promotionals$/);
    expect(applied).toEqual([[USER, true]]);
  });

  it('needs a reason and a duration, and changes nothing when RevenueCat fails', async () => {
    const ok = withRevenueCat({});
    for (const body of [
      { action: 'grant_premium', userId: USER, duration: 'monthly' },
      { action: 'grant_premium', userId: USER, duration: 'monthly', reason: 'ok' },
      { action: 'grant_premium', userId: USER, reason: 'Beta tester' },
      { action: 'grant_premium', userId: USER, duration: 'forever', reason: 'Beta tester' },
    ]) {
      expect((await handleAdminUsers(post(body), ok.deps)).status).toBe(400);
    }
    expect(ok.fetchFn).not.toHaveBeenCalled();

    const down = withRevenueCat({}, 500);
    const res = await handleAdminUsers(
      post({ action: 'grant_premium', userId: USER, duration: 'weekly', reason: 'Beta tester' }),
      down.deps,
    );
    expect(res.status).toBe(502);
    expect(down.applied).toEqual([]);
    expect(down.audits).toEqual([]);
  });

  it('says when RevenueCat is not configured, and keeps the usual access rules', async () => {
    const { deps } = setup({ role: 'admin' });
    const body = { action: 'grant_premium', userId: USER, duration: 'weekly', reason: 'Beta' };
    expect((await handleAdminUsers(post(body), deps)).status).toBe(503);
    const support = setup({ role: 'support' });
    expect((await handleAdminUsers(post(body), support.deps)).status).toBe(403);
    const self = withRevenueCat({});
    expect((await handleAdminUsers(post({ ...body, userId: ADMIN }), self.deps)).status).toBe(400);
  });
});
