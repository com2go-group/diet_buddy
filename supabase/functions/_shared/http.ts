/** CORS headers for browser (web build) calls; native apps ignore them. */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
  });
}

/** Error body the app understands: { error: code }. Codes are stable; messages live in the app. */
export function fail(code: string, status: number): Response {
  return json({ error: code }, status);
}
