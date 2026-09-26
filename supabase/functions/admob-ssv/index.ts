import { createClient } from 'jsr:@supabase/supabase-js@2';

import { handleAdmobSsv, VERIFIER_KEYS_URL, type VerifierKey } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);

let cache: { keys: VerifierKey[]; at: number } | null = null;

async function getKeys(): Promise<VerifierKey[]> {
  if (cache && Date.now() - cache.at < 12 * 3_600_000) return cache.keys;
  const res = await fetch(VERIFIER_KEYS_URL);
  if (!res.ok) throw new Error(`verifier keys ${res.status}`);
  const { keys } = (await res.json()) as { keys: VerifierKey[] };
  cache = { keys, at: Date.now() };
  return keys;
}

Deno.serve((req) =>
  handleAdmobSsv(req, {
    subtle: crypto.subtle,
    getKeys,
    async recordUnlock(userId, type, target) {
      const { error } = await admin
        .from('ad_unlocks')
        .upsert(
          { user_id: userId, unlock_type: type, target_id: target },
          { onConflict: 'user_id,unlock_type,target_id', ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    },
  }),
);
