import { corsHeaders, fail } from '../_shared/http.ts';

/** Every table holding a user's personal data (CLAUDE.md §13, docs/data-inventory.md). */
export const EXPORT_TABLES = [
  'profiles',
  'consents',
  'consent_events',
  'goals',
  'preferences',
  'body_metrics',
  'plans',
  'meal_plans',
  'food_logs',
  'water_logs',
  'checkins',
  'progress_photos',
  'coach_conversations',
  'coach_messages',
  'user_achievements',
  'ad_unlocks',
  'notifications',
  'device_connections',
  'push_tokens',
  'notification_preferences',
  'xp_events',
  'ai_usage',
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];

export interface ExportStore {
  account(
    userId: string,
  ): Promise<{ id: string; email: string | null; phone: string | null; created_at: string }>;
  rows(table: ExportTable, userId: string): Promise<Record<string, unknown>[]>;
  files(userId: string): Promise<string[]>;
}

export interface ExportDeps {
  getUserId(req: Request): Promise<string | null>;
  store: ExportStore;
  now?: () => Date;
}

/** POST → the user's data as one JSON document (GDPR art. 15 and 20). */
export async function handleExportData(req: Request, deps: ExportDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const table of EXPORT_TABLES) tables[table] = await deps.store.rows(table, userId);
    const body = {
      format: 'dietbuddy-export-v1',
      exported_at: (deps.now?.() ?? new Date()).toISOString(),
      account: await deps.store.account(userId),
      tables,
      files: { 'progress-photos': await deps.store.files(userId) },
    };
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="dietbuddy-export.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('export-data failed', e);
    return fail('server_error', 500);
  }
}
