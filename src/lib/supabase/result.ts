type SupabaseError = { message: string };
/** Matches both Supabase response shapes: { data, error: null } | { data: null, error }. */
type Result<T> = { data: T; error: null } | { data: null; error: SupabaseError };

/** Returns the data or throws the Supabase error; null means "no row" (maybeSingle). */
export function optional<T>(result: Result<T>): T | null {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Like optional(), but a missing row is an error too. */
export function required<T>(result: Result<T | null>): T {
  const data = optional(result);
  if (data === null) throw new Error('Expected a row');
  return data;
}
