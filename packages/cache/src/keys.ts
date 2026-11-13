/**
 * Where the storefront's shared data cache lives, and the Redis key scheme
 * every reader and writer of it uses.
 *
 * `CACHE_STORE=redis` (set before the build, on both sites) puts the
 * storefront's data cache in Upstash Redis through apps/web's custom Next
 * cache handler, and lets apps/admin record invalidations in it directly.
 * Unset means Next's built-in per-process cache — local development, or a
 * host with its own shared cache (Vercel).
 *
 * `CACHE_NAMESPACE` separates environments that share one Redis database
 * (production vs. staging); it must be identical on web and admin.
 *
 * apps/web/cache-handler.mjs repeats the few constants below, because Next
 * loads a cache handler at runtime outside the bundler and it can't import
 * workspace TypeScript. apps/web/testing/unit/cache-handler.test.ts asserts
 * the two copies agree.
 */

export const KEY_PREFIX = "sfc";

/** How long an invalidation is remembered — at least as long as any entry can live. */
export const TAG_TTL_SECONDS = 86_400;

/** No entry outlives this in Redis, whatever its revalidate time. */
export const ENTRY_MAX_TTL_SECONDS = 86_400;

export type CacheStore = "redis" | "default";

type Env = Record<string, string | undefined>;

export function cacheStore(env: Env = process.env): CacheStore {
  return env.CACHE_STORE?.trim().toLowerCase() === "redis" ? "redis" : "default";
}

export function cacheNamespace(env: Env = process.env): string {
  return env.CACHE_NAMESPACE?.trim() || "dev";
}

export function entryKey(namespace: string, key: string): string {
  return `${KEY_PREFIX}:${namespace}:e:${key}`;
}

export function tagKey(namespace: string, tag: string): string {
  return `${KEY_PREFIX}:${namespace}:t:${tag}`;
}

/** The same Upstash credentials the rate limiter uses (packages/security/src/rate-limit.ts). */
export function upstashConfig(env: Env = process.env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}
