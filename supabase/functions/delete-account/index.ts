import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { PHOTO_BUCKET } from '../export-data/store.ts';
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
    async removeFiles(userId) {
      let removed = 0;
      for (;;) {
        const { data, error } = await admin.storage.from(PHOTO_BUCKET).list(userId, { limit: 100 });
        if (error) throw new Error(error.message);
        if (!data?.length) return removed;
        const { error: removeError } = await admin.storage
          .from(PHOTO_BUCKET)
          .remove(data.map((f) => `${userId}/${f.name}`));
        if (removeError) throw new Error(removeError.message);
        removed += data.length;
      }
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
  }),
);
