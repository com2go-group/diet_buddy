import { createClient } from 'jsr:@supabase/supabase-js@2';

import { EXPO_PUSH_URL, handlePushDispatch } from './handler.ts';
import { supabasePushStore } from './store.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');

const store = supabasePushStore(db);

Deno.serve((req) =>
  handlePushDispatch(req, {
    secret: Deno.env.get('CRON_SECRET'),
    store,
    async send(messages) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(expoToken ? { authorization: `Bearer ${expoToken}` } : {}),
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) throw new Error(`expo push ${res.status}`);
      return (
        (await res.json()) as { data: { status: 'ok' | 'error'; details?: { error?: string } }[] }
      ).data;
    },
  }),
);
