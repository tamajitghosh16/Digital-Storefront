/**
 * Wraps a DB/Supabase call so pages render sample data instead of crashing
 * when there's no live DATABASE_URL to reach (Phase 0 scaffold) or the
 * table is simply empty. The page still renders, but real errors are
 * logged rather than silently swallowed — a database outage or a denied
 * query must leave a trace in the logs. Never use this for order, payment,
 * library or account data: a fallback there would show the wrong person's
 * (sample) data instead of failing.
 */
export async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await fn();
    if (result == null) return fallback;
    if (Array.isArray(result) && result.length === 0) return fallback as T;
    return result;
  } catch (error) {
    console.error("[withFallback] query failed; rendering fallback data", error);
    return fallback;
  }
}
