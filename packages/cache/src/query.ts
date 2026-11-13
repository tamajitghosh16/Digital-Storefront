import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { recordDeduped, recordError, recordLookup, recordMiss } from "./metrics";

/**
 * The one way either app caches a read across requests.
 *
 * `cachedQuery()` turns an async query into a cached reader:
 *
 *   const getBook = cachedQuery(
 *     { name: "book-row", ttl: TTL.catalogue, tags: (slug) => productEntryTags("BOOK", slug) },
 *     (slug: string) => prisma.product.findFirst({ where: { slug } })
 *   );
 *
 * Layered, from nearest to farthest:
 *  1. **Per request.** Identical calls in one render (generateMetadata and
 *     the page, header and footer) share one lookup.
 *  2. **In flight.** Identical calls from concurrent requests in this
 *     process share one lookup, so a hot key that was just invalidated
 *     costs one query, not one per shopper (cache stampede).
 *  3. **Across requests.** Next's data cache (`unstable_cache`), tagged per
 *     call so invalidations stay narrow. With `CACHE_STORE=redis` that cache
 *     lives in Redis, shared by every process (apps/web/cache-handler.mjs).
 *
 * The query must not read the request (`cookies()`, `headers()`) — pass
 * what it needs as arguments; they become part of the key. Never use this
 * for anything checkout prices a charge from, or for per-user data.
 *
 * Values round-trip through JSON on a hit (and come back as-is on a miss),
 * so `revive` runs on both to restore what JSON flattens — Dates.
 *
 * Keeping every cached read behind this one function is deliberate: moving
 * to Next's `'use cache'` once the CSP allows it (docs/adr/0001) is a change
 * here, not in every caller.
 */

export interface CachedQueryOptions<A extends unknown[], R> {
  /** Stable, unique name: part of the cache key and the metrics label. */
  name: string;
  /** Seconds an entry may live without an invalidation (see ./policy.ts). */
  ttl: number;
  /** The tags this call's entry carries; may depend on the arguments (and take fewer of them). */
  tags: readonly string[] | NoInfer<(...args: A) => readonly string[]>;
  /** Restores what the JSON round trip flattened. Runs on hits and misses alike. */
  revive?: (value: R) => R;
}

// Scoped to one server request by React; outside a render (a Route Handler,
// a test) it simply isn't shared, which only costs the dedupe.
const requestScope = cache(() => new Map<string, Promise<unknown>>());
const inFlight = new Map<string, Promise<unknown>>();

export function cachedQuery<A extends unknown[], R>(
  options: CachedQueryOptions<A, R>,
  query: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  const { name, ttl, revive } = options;
  // The query's own source is part of the key, so a deploy that changes
  // what it selects never reads entries shaped by the old code.
  const version = createHash("sha256").update(query.toString()).digest("hex").slice(0, 12);
  const keyParts = [name, version];

  async function lookup(args: A): Promise<R> {
    recordLookup(name);
    const tags = typeof options.tags === "function" ? options.tags(...args) : options.tags;
    const timedQuery = async (...queryArgs: A): Promise<R> => {
      const started = performance.now();
      try {
        const value = await query(...queryArgs);
        recordMiss(name, performance.now() - started);
        return value;
      } catch (error) {
        recordError(name);
        throw error;
      }
    };
    const value = (await unstable_cache(timedQuery, keyParts, { tags: [...tags], revalidate: ttl })(...args)) as R;
    return revive ? revive(value) : value;
  }

  return (...args: A): Promise<R> => {
    const key = `${name}:${JSON.stringify(args)}`;

    const scope = requestScope();
    const sameRequest = scope.get(key) as Promise<R> | undefined;
    if (sameRequest) return sameRequest;

    let pending = inFlight.get(key) as Promise<R> | undefined;
    if (pending) {
      recordDeduped(name);
    } else {
      pending = lookup(args).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
    }
    scope.set(key, pending);
    return pending;
  };
}
