import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { removeUserFiles } from '../export-data/store.ts';
import { handleDeleteAccount } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);

Deno.serve((req) =>
  handleDeleteAccount(req, {
    getUserId: (r) => userIdFromRequest(admin, r),
    removeFiles: (userId) => removeUserFiles(admin, userId),
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
  }),
);
