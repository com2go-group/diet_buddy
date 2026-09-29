import { corsHeaders, fail, json } from '../_shared/http.ts';
import type { Admission } from '../_shared/rateLimit.ts';
import { englishQuery, languageField, type Language } from '../_shared/language.ts';
import type { LlmProvider } from '../_shared/llm.ts';
import { parseQuery, type FoodResult } from '../_shared/usda.ts';
import { searchUsda, UsdaError } from '../_shared/usdaClient.ts';

export interface FoodSearchDeps {
  /** Per-user caps (shared USDA / Open Food Facts quotas); omitted in tests that don't need it. */
  admit?: (req: Request) => Promise<Admission>;
  apiKey: string | undefined;
  fetch: typeof fetch;
  /** Turns searches typed in the app's other languages into English (USDA is English only). */
  llm?: LlmProvider | null;
  /**
   * European tables (CIQUAL): the typed text in the user's language and the English query.
   * Their foods come first; they're what people in the EU actually buy and cook.
   */
  searchEu?(typed: string, english: string, language: Language | undefined): Promise<FoodResult[]>;
}

/** European foods shown before USDA's. */
export const EU_RESULTS = 5;

/**
 * POST { query, language? } → { foods: FoodResult[] }. Nutrition numbers come only from USDA (CLAUDE.md §9);
 * the API key stays on the server. Supabase verifies the caller's JWT before this runs.
 */
export async function handleFoodSearch(req: Request, deps: FoodSearchDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  const admission = deps.admit ? await deps.admit(req) : 'ok';
  if (admission === 'unauthorized') return fail('unauthorized', 401);
  if (admission === 'limited') return fail('rate_limited', 429);
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

  const eu = deps.searchEu
    ? await deps.searchEu(typed, query, language).catch((e: unknown) => {
        console.error('food-search: EU foods failed', e);
        return [] as FoodResult[];
      })
    : [];
  let usda: FoodResult[];
  try {
    usda = await searchUsda(query, deps.apiKey, deps.fetch);
  } catch (e) {
    // European results alone are still an answer.
    if (eu.length) return json({ foods: eu.slice(0, EU_RESULTS) });
    return fail(
      e instanceof UsdaError && e.status === 429 ? 'rate_limited' : 'upstream_failed',
      502,
    );
  }
  const foods = [...eu.slice(0, EU_RESULTS), ...usda];
  // Results depend only on the query; let clients and CDNs reuse them briefly.
  return json({ foods }, 200, { 'Cache-Control': 'private, max-age=3600' });
}
