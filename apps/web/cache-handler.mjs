// @ts-check
/**
 * apps/web's Next.js cache handler for `CACHE_STORE=redis`: puts the
 * storefront's data cache (everything `cachedQuery()` / `unstable_cache`
 * stores) in Upstash Redis, shared by every server process and surviving
 * restarts and redeploys. next.config.ts wires it in only when
 * `CACHE_STORE=redis` at build time; otherwise Next keeps its built-in
 * per-process cache. Design and trade-offs: docs/adr/0001-caching-strategy.md.
 *
 * Layers, nearest first:
 *  - an in-process LRU of entries (L1, bounded by bytes), so a warm page
 *    costs no network at all;
 *  - a per-tag memo of invalidation times, re-read from Redis at most once
 *    a second per tag, so an invalidation made by another process (or by
 *    apps/admin writing the ledger directly) is honoured within ~1s;
 *  - Redis: `<prefix>:<ns>:e:<key>` entries with a TTL, and
 *    `<prefix>:<ns>:t:<tag>` = the last time that tag was invalidated.
 *
 * An entry is dead when any of its tags was invalidated after it was
 * *read for* — the time of the lookup that missed, not the time it was
 * stored — so a query that raced an invalidation can't store its stale
 * result as fresh.
 *
 * Resilience: every Redis call has a short timeout; on failure a lookup is
 * served from L1 when possible or treated as a miss (the page reads the
 * database), and a store is kept in L1 only. Three failures in a row open
 * a breaker for 30s. Nothing here ever throws into a render.
 *
 * Loaded by Next at runtime outside the bundler, so it imports nothing
 * from the workspace: the key scheme below repeats packages/cache/src/
 * keys.ts, and apps/web/testing/unit/cache-handler.test.ts asserts they
 * agree. Next creates a handler per request, so all state is module-level.
 */

// --- Shared key scheme (mirrors packages/cache/src/keys.ts) ---------------

export const KEY_PREFIX = "sfc";
export const TAG_TTL_SECONDS = 86_400;
export const ENTRY_MAX_TTL_SECONDS = 86_400;

/** @param {string} namespace @param {string} key */
export function entryKey(namespace, key) {
  return `${KEY_PREFIX}:${namespace}:e:${key}`;
}

/** @param {string} namespace @param {string} tag */
export function tagKey(namespace, tag) {
  return `${KEY_PREFIX}:${namespace}:t:${tag}`;
}

// --- Tuning ----------------------------------------------------------------

/**
 * Long enough for a cold process's first call — a fresh TLS handshake to
 * Upstash while the event loop is still busy loading the app (Hostinger
 * restarts a site after every idle stop). At 250 ms those first calls timed
 * out, tripped the breaker, and the whole first half-minute after a restart
 * skipped the cache. Short enough that a dead Redis costs a page at most a
 * second before the breaker takes over.
 */
const REDIS_TIMEOUT_MS = 1_000;
const TAG_MEMO_MS = 1_000;
/**
 * Tolerated clock difference between servers (admin's ledger writes vs. this
 * process's lookup times). NTP keeps hosts within milliseconds; the cost of a
 * larger margin is that an entry rebuilt within it after a save counts as
 * stale too, so every process rebuilds it instead of sharing one rebuild.
 */
const CLOCK_SKEW_MS = 250;
const L1_MAX_BYTES = 32 * 1024 * 1024;
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 30_000;
const MAX_TRACKED_LOOKUPS = 10_000;

const STORE_STATS_KEY = Symbol.for("repo.cache.storeStats");

/**
 * @typedef {{ lastModified: number, value: any, tags: string[] }} StoredEntry
 * @typedef {{ entry: StoredEntry, bytes: number }} L1Slot
 * @typedef {{ url: string, token: string, namespace: string }} RedisConfig
 */

// --- Module state (shared by every per-request handler instance) ---------

/** @type {Map<string, L1Slot>} */
const l1 = new Map();
let l1Bytes = 0;
/** @type {Map<string, { invalidatedAt: number, checkedAt: number }>} */
const tagMemo = new Map();
/** When each key was last looked up — what a following store is "as of". @type {Map<string, number>} */
const lookedUpAt = new Map();
/** Non-FETCH entries (sitemap, robots): small, per process. @type {Map<string, StoredEntry>} */
const local = new Map();
let consecutiveFailures = 0;
let breakerOpenUntil = 0;
/** @type {RedisConfig | null | undefined} */
let config;
let warnedNoConfig = false;

/** @returns {Record<string, number>} */
function stats() {
  const holder = /** @type {Record<symbol, Record<string, number> | undefined>} */ (/** @type {unknown} */ (globalThis));
  return (holder[STORE_STATS_KEY] ??= {});
}

/** @param {string} name @param {number} [by] */
function count(name, by = 1) {
  const s = stats();
  s[name] = (s[name] ?? 0) + by;
}

/** @returns {RedisConfig | null} */
function redisConfig() {
  if (config !== undefined) return config;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  config = url && token ? { url: url.replace(/\/$/, ""), token, namespace: process.env.CACHE_NAMESPACE?.trim() || "dev" } : null;
  if (!config && !warnedNoConfig) {
    warnedNoConfig = true;
    console.warn(
      JSON.stringify({ event: "cache.store_unconfigured", detail: "CACHE_STORE=redis without Upstash credentials — caching in this process only" })
    );
  }
  return config;
}

/** Test hook: forget all module state. */
export function __resetForTests() {
  l1.clear();
  l1Bytes = 0;
  tagMemo.clear();
  lookedUpAt.clear();
  local.clear();
  consecutiveFailures = 0;
  breakerOpenUntil = 0;
  config = undefined;
  warnedNoConfig = false;
}

// --- Redis over Upstash REST ---------------------------------------------

/**
 * One round trip for any number of commands; null when Redis is
 * unavailable (breaker open, timeout, error) — callers degrade, never throw.
 * @param {RedisConfig} cfg
 * @param {(string | number)[][]} commands
 * @returns {Promise<unknown[] | null>}
 */
async function pipeline(cfg, commands) {
  if (Date.now() < breakerOpenUntil) {
    count("breakerSkips");
    return null;
  }
  const started = performance.now();
  try {
    const response = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((command) => command.map(String))),
      cache: "no-store",
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
    const results = /** @type {{ result?: unknown, error?: string }[]} */ (await response.json());
    const failed = results.find((result) => result.error);
    if (failed) throw new Error(failed.error);
    consecutiveFailures = 0;
    const ms = performance.now() - started;
    count("redisCalls");
    count("redisMs", Math.round(ms));
    const s = stats();
    s.redisMaxMs = Math.max(s.redisMaxMs ?? 0, Math.round(ms));
    return results.map((result) => result.result);
  } catch (error) {
    count("redisErrors");
    consecutiveFailures += 1;
    if (consecutiveFailures >= BREAKER_THRESHOLD && Date.now() >= breakerOpenUntil) {
      breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
      count("breakerOpened");
      console.warn(
        JSON.stringify({
          event: "cache.store_unavailable",
          detail: `Redis failed ${consecutiveFailures} times in a row; reading the database directly for ${BREAKER_COOLDOWN_MS / 1000}s`,
          error: String(error),
        })
      );
    }
    return null;
  }
}

// --- L1 -------------------------------------------------------------------

/** @param {string} key @param {StoredEntry} entry @param {number} bytes */
function l1Set(key, entry, bytes) {
  const previous = l1.get(key);
  if (previous) {
    l1Bytes -= previous.bytes;
    l1.delete(key);
  }
  if (bytes > L1_MAX_BYTES / 8) return; // one huge entry mustn't flush everything else
  l1.set(key, { entry, bytes });
  l1Bytes += bytes;
  // Map iteration is insertion order: the first key is the least recently used.
  for (const [oldest, slot] of l1) {
    if (l1Bytes <= L1_MAX_BYTES) break;
    l1.delete(oldest);
    l1Bytes -= slot.bytes;
  }
}

/** @param {string} key */
function l1Get(key) {
  const slot = l1.get(key);
  if (!slot) return undefined;
  l1.delete(key); // refresh recency
  l1.set(key, slot);
  return slot.entry;
}

/** @param {string} key */
function l1Delete(key) {
  const slot = l1.get(key);
  if (!slot) return;
  l1.delete(key);
  l1Bytes -= slot.bytes;
}

// --- Tags -----------------------------------------------------------------

/** @param {string[]} tags @param {number} now */
function tagsNeedingCheck(tags, now) {
  return tags.filter((tag) => {
    const memo = tagMemo.get(tag);
    return !memo || now - memo.checkedAt > TAG_MEMO_MS;
  });
}

/** @param {string} tag @param {number} invalidatedAt @param {number} now */
function rememberTag(tag, invalidatedAt, now) {
  const known = tagMemo.get(tag)?.invalidatedAt ?? 0;
  tagMemo.set(tag, { invalidatedAt: Math.max(known, invalidatedAt), checkedAt: now });
}

/** Whether any tag was invalidated after the entry was read for. @param {StoredEntry} entry @param {string[]} tags */
function isExpiredByTags(entry, tags) {
  return tags.some((tag) => (tagMemo.get(tag)?.invalidatedAt ?? 0) > entry.lastModified - CLOCK_SKEW_MS);
}

/** @param {any} value */
function entryTtlSeconds(value) {
  const revalidate = typeof value?.revalidate === "number" ? value.revalidate : ENTRY_MAX_TTL_SECONDS;
  return Math.min(Math.max(Math.ceil(revalidate * 2), 60), ENTRY_MAX_TTL_SECONDS);
}

/**
 * A raw Redis value as an entry, kept in L1; undefined when absent or unreadable.
 * @param {string} key
 * @param {unknown} raw
 * @returns {StoredEntry | undefined}
 */
function parseAndRemember(key, raw) {
  if (typeof raw !== "string") return undefined;
  try {
    const entry = /** @type {StoredEntry} */ (JSON.parse(raw));
    l1Set(key, entry, raw.length);
    return entry;
  } catch {
    return undefined;
  }
}

/** @param {string} key @param {number} now */
function trackLookup(key, now) {
  if (lookedUpAt.size >= MAX_TRACKED_LOOKUPS) lookedUpAt.clear();
  lookedUpAt.set(key, now);
}

// --- The handler ------------------------------------------------------------

export default class RedisCacheHandler {
  // Next passes a context object (dist dir, dev flag…); nothing in it is needed here.

  /**
   * @param {string} key
   * @param {{ kind?: string, tags?: string[], softTags?: string[] }} [ctx]
   * @returns {Promise<{ lastModified: number, value: any } | null>}
   */
  async get(key, ctx = {}) {
    if (ctx.kind !== "FETCH") {
      const entry = local.get(key);
      return entry ? { lastModified: entry.lastModified, value: entry.value } : null;
    }

    const now = Date.now();
    trackLookup(key, now);
    const tags = ctx.tags ?? [];
    const cfg = redisConfig();
    const cached = l1Get(key);
    const unchecked = cfg ? tagsNeedingCheck(tags, now) : [];

    /** @type {StoredEntry | undefined} */
    let entry = cached;
    if (cfg && (!cached || unchecked.length > 0)) {
      /** @type {(string | number)[][]} */
      const commands = [];
      if (unchecked.length > 0) commands.push(["MGET", ...unchecked.map((tag) => tagKey(cfg.namespace, tag))]);
      if (!cached) commands.push(["GET", entryKey(cfg.namespace, key)]);
      const results = await pipeline(cfg, commands);

      // When Redis is unavailable (`results` null) an L1 entry is still
      // served — at worst as stale as Next's own revalidate time allows.
      if (results) {
        let index = 0;
        if (unchecked.length > 0) {
          const times = /** @type {(string | null)[]} */ (results[index++] ?? []);
          unchecked.forEach((tag, i) => rememberTag(tag, Number(times[i] ?? 0) || 0, now));
        }
        if (!cached) entry = parseAndRemember(key, results[index]);
        if (entry && !cached) count("redisHits");
      }
    }

    // Implicit path tags (`softTags`) are only ever invalidated by
    // `revalidatePath()` in this process — the storefront never calls it and
    // admin never writes them — so they're checked locally, not in Redis.
    const allTags = [...tags, ...(ctx.softTags ?? [])];
    if (entry && isExpiredByTags(entry, allTags)) {
      count("tagExpired");
      l1Delete(key);
      entry = undefined;
      // The stale copy was this process's own: another process may already
      // have rebuilt the entry since the invalidation, so look in Redis once
      // before running the query here too.
      if (cached && cfg) {
        const results = await pipeline(cfg, [["GET", entryKey(cfg.namespace, key)]]);
        const fresh = parseAndRemember(key, results?.[0]);
        if (fresh && !isExpiredByTags(fresh, allTags)) {
          entry = fresh;
          count("redisHits");
        } else if (fresh) {
          l1Delete(key);
        }
      }
    } else if (entry && entry === cached) {
      count("l1Hits");
    }

    if (!entry) {
      count("misses");
      return null;
    }
    return { lastModified: entry.lastModified, value: entry.value };
  }

  /**
   * @param {string} key
   * @param {any} data
   * @param {{ tags?: string[], fetchCache?: boolean }} [ctx]
   */
  async set(key, data, ctx = {}) {
    if (!data) return;
    if (data.kind !== "FETCH") {
      local.set(key, { lastModified: Date.now(), value: data, tags: [] });
      return;
    }

    // "As of" the lookup that missed: an invalidation after that moment
    // must still kill this entry, even though it's being stored afterwards.
    const lastModified = lookedUpAt.get(key) ?? Date.now();
    lookedUpAt.delete(key);
    const tags = ctx.tags ?? data.tags ?? [];
    /** @type {StoredEntry} */
    const entry = { lastModified, value: data, tags };
    if (isExpiredByTags(entry, tags)) {
      // Raced an invalidation this process already knows about: storing it
      // would only be thrown away on the next read.
      count("skippedSets");
      return;
    }

    const raw = JSON.stringify(entry);
    l1Set(key, entry, raw.length);
    count("sets");

    const cfg = redisConfig();
    if (!cfg) return;
    await pipeline(cfg, [["SET", entryKey(cfg.namespace, key), raw, "EX", entryTtlSeconds(data)]]);
  }

  /**
   * Called for `revalidateTag()` / `revalidatePath()` in this process. Next
   * also passes the expiry profile; the storefront only ever expires at once
   * (`{ expire: 0 }`), so every call is treated as an immediate expiry.
   * @param {string | string[]} tags
   */
  async revalidateTag(tags) {
    const list = [...new Set(Array.isArray(tags) ? tags : [tags])].filter(Boolean);
    if (list.length === 0) return;
    const now = Date.now();
    for (const tag of list) rememberTag(tag, now, now);
    count("tagsInvalidated", list.length);

    const cfg = redisConfig();
    if (!cfg) return;
    await pipeline(
      cfg,
      list.map((tag) => ["SET", tagKey(cfg.namespace, tag), now, "EX", TAG_TTL_SECONDS])
    );
  }

  resetRequestCache() {}
}
