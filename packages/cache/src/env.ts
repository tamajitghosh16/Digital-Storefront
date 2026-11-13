import { cacheStore, upstashConfig } from "./keys";

/**
 * A startup invariant for `checkEnvironment()` (packages/security/src/env.ts),
 * so a production build that asked for the Redis cache but can't reach it,
 * or could read another environment's entries, refuses to boot. Returns an
 * error message, or null when the configuration is fine.
 */
export function cacheConfigProblem(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.CACHE_STORE?.trim().toLowerCase();
  if (raw && raw !== "redis" && raw !== "default") {
    return `CACHE_STORE="${env.CACHE_STORE}" is not a known cache store — use "redis" or leave it unset`;
  }
  if (cacheStore(env) !== "redis") return null;
  if (!upstashConfig(env)) {
    return "CACHE_STORE=redis but UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set — the storefront's data cache would have nowhere to live";
  }
  if (!env.CACHE_NAMESPACE?.trim()) {
    return 'CACHE_STORE=redis but CACHE_NAMESPACE is not set — set it (e.g. "prod") identically on web and admin, so environments sharing one Redis never read each other\'s cache';
  }
  return null;
}
