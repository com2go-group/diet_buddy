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
});
