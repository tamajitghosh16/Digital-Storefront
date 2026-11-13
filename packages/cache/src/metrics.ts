/**
 * Cache hit/miss counters, logged as one structured JSON line a minute:
 *
 *   {"event":"cache.stats","windowSeconds":60,"caches":{"cms:content":{"lookups":120,"hits":118,...}},"store":{...}}
 *
 * `caches` comes from `cachedQuery()` (./query.ts): a lookup is one call
 * that reached the cache, a miss is one that had to run its query, and
 * `deduped` counts calls answered by an identical call already in flight.
 * `store` comes from apps/web/cache-handler.mjs (when `CACHE_STORE=redis`),
 * which counts into a process-global object because it can't import this
 * module; it's reported and reset with each line.
 *
 * Counters are per process and reset after each line, so a log search can
 * sum them. `CACHE_DEBUG=1` additionally logs every miss as it happens.
 * Never throws: metrics must not break a page.
 */

interface QueryStats {
  lookups: number;
  misses: number;
  errors: number;
  deduped: number;
  missMs: number;
  maxMissMs: number;
}

const FLUSH_INTERVAL_MS = 60_000;
export const STORE_STATS_KEY = Symbol.for("repo.cache.storeStats");

type StoreStatsHolder = { [STORE_STATS_KEY]?: Record<string, number> };

const queries = new Map<string, QueryStats>();
let windowStart = Date.now();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function debugEnabled(): boolean {
  const flag = process.env.CACHE_DEBUG?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

function statsFor(name: string): QueryStats {
  let stats = queries.get(name);
  if (!stats) {
    stats = { lookups: 0, misses: 0, errors: 0, deduped: 0, missMs: 0, maxMissMs: 0 };
    queries.set(name, stats);
  }
  return stats;
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    flushCacheStats();
  }, FLUSH_INTERVAL_MS);
  // Never keep a process (or a test run) alive just to log.
  flushTimer.unref?.();
}

export function recordLookup(name: string): void {
  statsFor(name).lookups += 1;
  scheduleFlush();
}

export function recordDeduped(name: string): void {
  statsFor(name).deduped += 1;
  scheduleFlush();
}

export function recordMiss(name: string, ms: number): void {
  const stats = statsFor(name);
  stats.misses += 1;
  stats.missMs += ms;
  stats.maxMissMs = Math.max(stats.maxMissMs, ms);
  if (debugEnabled()) console.log(JSON.stringify({ event: "cache.miss", cache: name, ms: Math.round(ms) }));
}

export function recordError(name: string): void {
  statsFor(name).errors += 1;
}

function takeStoreStats(): Record<string, number> | undefined {
  const holder = globalThis as StoreStatsHolder;
  const stats = holder[STORE_STATS_KEY];
  if (!stats || Object.values(stats).every((value) => value === 0)) return undefined;
  holder[STORE_STATS_KEY] = {};
  return stats;
}

/** Logs and resets the counters; returns what was logged (null when there was nothing). */
export function flushCacheStats(now: number = Date.now()): Record<string, unknown> | null {
  const store = takeStoreStats();
  if (queries.size === 0 && !store) return null;

  const caches: Record<string, unknown> = {};
  for (const [name, stats] of queries) {
    const hits = Math.max(0, stats.lookups - stats.misses);
    caches[name] = {
      lookups: stats.lookups,
      hits,
      misses: stats.misses,
      errors: stats.errors,
      deduped: stats.deduped,
      hitRatio: stats.lookups ? Math.round((hits / stats.lookups) * 1000) / 1000 : null,
      avgMissMs: stats.misses ? Math.round(stats.missMs / stats.misses) : null,
      maxMissMs: Math.round(stats.maxMissMs),
    };
  }

  const line: Record<string, unknown> = {
    event: "cache.stats",
    at: new Date(now).toISOString(),
    pid: process.pid,
    windowSeconds: Math.round((now - windowStart) / 1000),
    caches,
    ...(store ? { store } : {}),
  };
  queries.clear();
  windowStart = now;
  try {
    console.log(JSON.stringify(line));
  } catch {
    // A logger that can't serialise must not take the request down.
  }
  return line;
}
