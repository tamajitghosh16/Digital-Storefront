/**
 * Wraps a DB/Supabase call so pages render sample data instead of crashing
 * when there's no live DATABASE_URL to reach (Phase 0 scaffold) or the
 * table is simply empty. Real errors are swallowed intentionally here —
 * this is a frontend-preview aid, not production error handling.
 */
export async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await fn();
    if (result == null) return fallback;
    if (Array.isArray(result) && result.length === 0) return fallback as T;
    return result;
  } catch {
    return fallback;
  }
}
