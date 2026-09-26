import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { handleExportData } from './handler.ts';
import { supabaseExportStore } from './store.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);
const store = supabaseExportStore(admin);

Deno.serve((req) =>
  handleExportData(req, { store, getUserId: (r) => userIdFromRequest(admin, r) }),
);
