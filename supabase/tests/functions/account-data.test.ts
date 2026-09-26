import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { handleDeleteAccount, type DeleteDeps } from '../../functions/delete-account/handler';
import {
  EXPORT_TABLES,
  handleExportData,
  type ExportStore,
} from '../../functions/export-data/handler';

const USER = '11111111-1111-1111-1111-111111111111';
const post = (body?: unknown, auth = true) =>
  new Request('http://localhost/fn', {
    method: 'POST',
    headers: auth ? { Authorization: 'Bearer t' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const getUserId = async (req: Request) => (req.headers.get('Authorization') ? USER : null);

describe('export-data', () => {
  it('covers every table with personal data (every table with a user_id column)', () => {
    const dir = join(__dirname, '../../migrations');
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    const tables = [...sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)]
      .filter(([, , body]) => /\n\s+user_id uuid/.test(body!))
      .map(([, name]) => name);
    expect([...tables].sort()).toEqual([...EXPORT_TABLES].sort());
  });

  it('returns the account, every table and file list as a JSON attachment', async () => {
    const store: ExportStore = {
      account: async (id) => ({
        id,
        email: 'a@example.com',
        phone: null,
        created_at: '2026-09-01T00:00:00Z',
      }),
      rows: jest.fn(async (table) =>
        table === 'food_logs' ? [{ name: 'Oats', user_id: USER }] : [],
      ),
      files: async () => [`${USER}/p1.jpg`],
    };
    const res = await handleExportData(post(), {
      store,
      getUserId,
      now: () => new Date('2026-09-26T12:00:00Z'),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('dietbuddy-export.json');
    const body = await res.json();
    expect(body.format).toBe('dietbuddy-export-v1');
    expect(body.account.email).toBe('a@example.com');
    expect(Object.keys(body.tables)).toEqual([...EXPORT_TABLES]);
    expect(body.tables.food_logs).toEqual([{ name: 'Oats', user_id: USER }]);
    expect(body.files['progress-photos']).toEqual([`${USER}/p1.jpg`]);
    expect((store.rows as jest.Mock).mock.calls.every(([, id]) => id === USER)).toBe(true);
  });

  it('requires sign-in', async () => {
    const store = {
      account: jest.fn(),
      rows: jest.fn(),
      files: jest.fn(),
    } as unknown as ExportStore;
    expect((await handleExportData(post(undefined, false), { store, getUserId })).status).toBe(401);
    expect(store.rows).not.toHaveBeenCalled();
  });
});

describe('delete-account', () => {
  const deps = (): DeleteDeps & { calls: string[] } => {
    const calls: string[] = [];
    return {
      calls,
      getUserId,
      removeFiles: async (id) => (calls.push(`files:${id}`), 2),
      deleteUser: async (id) => void calls.push(`user:${id}`),
    };
  };

  it('needs the explicit confirmation', async () => {
    const d = deps();
    const res = await handleDeleteAccount(post({ confirm: 'yes' }), d);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'confirmation_required' });
    expect(d.calls).toEqual([]);
  });

  it('removes files, then the user (tables cascade)', async () => {
    const d = deps();
    const res = await handleDeleteAccount(post({ confirm: 'DELETE' }), d);
    expect(await res.json()).toEqual({ deleted: true, files: 2 });
    expect(d.calls).toEqual([`files:${USER}`, `user:${USER}`]);
  });

  it('keeps the account if file removal fails, so the user can retry', async () => {
    const d = deps();
    d.removeFiles = async () => {
      throw new Error('storage down');
    };
    const res = await handleDeleteAccount(post({ confirm: 'DELETE' }), d);
    expect(res.status).toBe(500);
    expect(d.calls).toEqual([]);
  });

  it('requires sign-in', async () => {
    expect((await handleDeleteAccount(post({ confirm: 'DELETE' }, false), deps())).status).toBe(
      401,
    );
  });
});
