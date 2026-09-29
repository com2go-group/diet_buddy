import { corsHeaders, fail, json } from '../_shared/http.ts';
import { englishQuery, languageField } from '../_shared/language.ts';
import type { LlmProvider } from '../_shared/llm.ts';
import { parseQuery } from '../_shared/usda.ts';
import { searchUsda, UsdaError } from '../_shared/usdaClient.ts';

export interface FoodSearchDeps {
  apiKey: string | undefined;
  fetch: typeof fetch;
  /** Turns searches typed in the app's other languages into English (USDA is English only). */
  llm?: LlmProvider | null;
}

/**
 * POST { query, language? } → { foods: FoodResult[] }. Nutrition numbers come only from USDA (CLAUDE.md §9);
 * the API key stays on the server. Supabase verifies the caller's JWT before this runs.
 */
export async function handleFoodSearch(req: Request, deps: FoodSearchDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.apiKey) return fail('not_configured', 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('invalid_request', 400);
  }
  const input = body as { query?: unknown; language?: unknown } | null;
  const typed = parseQuery(input?.query);
  if (!typed) return fail('invalid_query', 400);
  const language = languageField.parse(input?.language);
  const query = parseQuery(await englishQuery(deps.llm ?? null, typed, language)) ?? typed;

  let foods;
  try {
    foods = await searchUsda(query, deps.apiKey, deps.fetch);
  } catch (e) {
    return fail(
      e instanceof UsdaError && e.status === 429 ? 'rate_limited' : 'upstream_failed',
      502,
    );
  }
  // Results depend only on the query; let clients and CDNs reuse them briefly.
  return json({ foods }, 200, { 'Cache-Control': 'private, max-age=3600' });
}
