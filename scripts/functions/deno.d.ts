/**
 * Minimal Deno globals so `tsc` can typecheck supabase/functions without a Deno install
 * (development happens on Windows). Only what the functions use; Deno's real types are wider.
 */
declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown;
  const env: { get(key: string): string | undefined };
}
