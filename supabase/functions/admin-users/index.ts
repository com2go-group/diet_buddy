import { createClient } from 'jsr:@supabase/supabase-js@2';

import { buildExport } from '../export-data/handler.ts';
import { removeUserFiles, supabaseExportStore } from '../export-data/store.ts';
import { handleAdminUsers, type AdminRole } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const exportStore = supabaseExportStore(admin);

Deno.serve((req) =>
  handleAdminUsers(req, {
    async getAdmin(r) {
      const auth = r.headers.get('Authorization');
      if (!auth) return null;
      // Ask the database as the caller: admin_me() checks the role and the aal2 claim.
      const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: auth } },
      });
      const [{ data: user }, { data: me }] = await Promise.all([
        caller.auth.getUser(auth.replace(/^Bearer /, '')),
        caller.rpc('admin_me'),
      ]);
      const row = (me as { role: AdminRole; mfa_verified: boolean }[] | null)?.[0];
      return user.user && row?.mfa_verified ? { userId: user.user.id, role: row.role } : null;
    },
    async roleOf(userId) {
      const { data } = await admin
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .limit(1);
      return ((data as { role: AdminRole }[] | null)?.[0]?.role ?? null) as AdminRole | null;
    },
    exportUser: (userId) => buildExport(exportStore, userId, new Date()),
    removeFiles: (userId) => removeUserFiles(admin, userId),
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
    async setBanned(userId, banned) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: banned ? '876000h' : 'none',
      });
      if (error) throw new Error(error.message);
    },
    async audit(adminId, action, target) {
      const { error } = await admin
        .from('admin_audit_log')
        .insert({ admin_id: adminId, action, target, details: {} });
      if (error) throw new Error(error.message);
    },
  }),
);
