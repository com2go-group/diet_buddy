import { corsHeaders, fail, json } from '../_shared/http.ts';
import { normalizeFoods, parseQuery, type FdcSearchFood } from '../_shared/usda.ts';

const FDC_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

export interface FoodSearchDeps {
  apiKey: string | undefined;
  fetch: typeof fetch;
}

/**
 * POST { query } → { foods: FoodResult[] }. Nutrition numbers come only from USDA (CLAUDE.md §9);
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
  const query = parseQuery((body as { query?: unknown } | null)?.query);
  if (!query) return fail('invalid_query', 400);

  const upstream = await deps
    .fetch(`${FDC_URL}?api_key=${encodeURIComponent(deps.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize: 25,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
      }),
    })
    .catch(() => null);
  if (!upstream || !upstream.ok) {
    return fail(upstream?.status === 429 ? 'rate_limited' : 'upstream_failed', 502);
  }
  const data = (await upstream.json().catch(() => null)) as { foods?: FdcSearchFood[] } | null;
  const foods = normalizeFoods(Array.isArray(data?.foods) ? data.foods : []);
  // Results depend only on the query; let clients and CDNs reuse them briefly.
  return json({ foods }, 200, { 'Cache-Control': 'private, max-age=3600' });
}
