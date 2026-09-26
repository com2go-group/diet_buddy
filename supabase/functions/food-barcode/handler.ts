import { corsHeaders, fail, json } from '../_shared/http.ts';
import { lookupBarcode, OffError, validBarcode } from '../_shared/openFoodFacts.ts';

export interface FoodBarcodeDeps {
  fetch: typeof fetch;
  /** Open Food Facts asks every app to identify itself: "AppName/Version (contact)". */
  userAgent: string;
}

/**
 * POST { barcode } → { food } from Open Food Facts, or 404 not_found. Supabase verifies the
 * caller's JWT before this runs; the lookup goes through the server so the user's IP and the
 * product they scanned aren't sent to a third party from the device.
 */
export async function handleFoodBarcode(req: Request, deps: FoodBarcodeDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  const body = (await req.json().catch(() => null)) as { barcode?: unknown } | null;
  const code = validBarcode(body?.barcode);
  if (!code) return fail('invalid_barcode', 400);
  try {
    const food = await lookupBarcode(code, deps.fetch, deps.userAgent);
    if (!food) return fail('not_found', 404);
    return json({ food }, 200, { 'Cache-Control': 'private, max-age=86400' });
  } catch (e) {
    return fail(
      e instanceof OffError && e.status === 429 ? 'rate_limited' : 'upstream_failed',
      502,
    );
  }
}
