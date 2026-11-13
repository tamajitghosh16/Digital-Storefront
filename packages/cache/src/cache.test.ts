import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` throws outside a React Server Components bundle.
vi.mock("server-only", () => ({}));

// React's `cache()` only memoizes inside a server render; stand in for one
// request scope that a test can reset.
const reactScope = vi.hoisted(() => ({ store: new Map<unknown, unknown>() }));
vi.mock("react", () => ({
  cache:
    <T>(fn: () => T) =>
    () => {
      if (!reactScope.store.has(fn)) reactScope.store.set(fn, fn());
      return reactScope.store.get(fn) as T;
    },
}));

// A minimal stand-in for Next's data cache: entries keyed like the real one
// (callback source + key parts + JSON args), stored as JSON, dropped by tag.
const nextCache = vi.hoisted(() => ({
  entries: new Map<string, { json: string; tags: string[] }>(),
  calls: [] as { keyParts: string[]; tags: string[]; revalidate: number }[],
}));
vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: unknown[]) => Promise<unknown>, keyParts: string[], options: { tags: string[]; revalidate: number }) =>
    async (...args: unknown[]) => {
      nextCache.calls.push({ keyParts, tags: options.tags, revalidate: options.revalidate });
      const key = `${fn.toString()}-${keyParts.join(",")}-${JSON.stringify(args)}`;
      const hit = nextCache.entries.get(key);
      if (hit) return JSON.parse(hit.json);
      const value = await fn(...args);
      nextCache.entries.set(key, { json: JSON.stringify(value), tags: options.tags });
      return value;
    },
}));

import {
  ALL_TAGS,
  CATALOGUE_TAG,
  CMS_TAG,
  COVERS_TAG,
  catalogueGroupOf,
  cmsChangedTags,
  cmsEntryTags,
  isAllowedTag,
  listingEntryTags,
  productChangedTags,
  productEntryTags,
  stockReturnedTags,
  stockTakenTags,
} from "./tags";
import { LOW_STOCK_MAX, SAME_DAY_MIN } from "./policy";
import { cacheNamespace, cacheStore, entryKey, tagKey, upstashConfig } from "./keys";
import { cacheConfigProblem } from "./env";
import { STORE_STATS_KEY, flushCacheStats } from "./metrics";
import { cachedQuery } from "./query";
import { writeTagLedger } from "./invalidate";

beforeEach(() => {
  reactScope.store.clear();
  nextCache.entries.clear();
  nextCache.calls.length = 0;
  flushQuietly();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function flushQuietly() {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const line = flushCacheStats();
  log.mockRestore();
  return line;
}

describe("tags", () => {
  const book = { slug: "gitanjali", productLine: "BOOK" as const, type: "PHYSICAL_BOOK" as const };
  const service = { slug: "cover-design", productLine: null, type: "SERVICE_PACKAGE" as const };

  it("gives every entry its umbrella plus its narrow tags", () => {
    expect(cmsEntryTags("faqs")).toEqual([CMS_TAG, "cms:faqs"]);
    expect(listingEntryTags("BOOK")).toEqual([CATALOGUE_TAG, "catalogue:BOOK"]);
    expect(productEntryTags("services", "cover-design")).toEqual([CATALOGUE_TAG, "catalogue:services", "product:cover-design"]);
  });

  it("puts a product in its line's listing, or services for a bare service package", () => {
    expect(catalogueGroupOf(book)).toBe("BOOK");
    expect(catalogueGroupOf(service)).toBe("services");
    expect(catalogueGroupOf({ productLine: null, type: "PHYSICAL_BOOK" })).toBeNull();
  });

  it("expires only the changed CMS sections", () => {
    expect(cmsChangedTags("banners", "banners")).toEqual(["cms:banners"]);
  });

  it("expires the old and new slug and listing when a product is edited", () => {
    const renamedIntoBooks = { ...service, slug: "cover-design-pro", productLine: "BOOK" as const, type: "EBOOK" as const };
    expect(productChangedTags(service, renamedIntoBooks).sort()).toEqual(
      [COVERS_TAG, "catalogue:services", "product:cover-design", "catalogue:BOOK", "product:cover-design-pro"].sort()
    );
    expect(productChangedTags(null, book).sort()).toEqual([COVERS_TAG, "catalogue:BOOK", "product:gitanjali"].sort());
  });

  it("re-lists a title only when an order changes what its tile shows", () => {
    // 20 → 19: still "Ships in 2 days" — only the product page refreshes.
    expect(stockTakenTags([{ ...book, before: 20, quantity: 1 }])).toEqual(["product:gitanjali"]);
    // Low stock shows an exact count; sold out shows "out of stock".
    expect(stockTakenTags([{ ...book, before: LOW_STOCK_MAX, quantity: 1 }])).toEqual(["product:gitanjali", "catalogue:BOOK"]);
    expect(stockTakenTags([{ ...book, before: 2, quantity: 2 }])).toEqual(["product:gitanjali", "catalogue:BOOK"]);
    // Leaving same-day stock changes the badge and the filter.
    expect(stockTakenTags([{ ...book, before: SAME_DAY_MIN, quantity: 1 }])).toEqual(["product:gitanjali", "catalogue:BOOK"]);
    expect(stockTakenTags([{ ...book, before: null, quantity: 5 }])).toEqual(["product:gitanjali"]);
  });

  it("re-lists the services page for any service package", () => {
    const lined = { ...service, productLine: "NAYA_BANDHU_APP" as const };
    expect(productChangedTags(lined)).toContain("catalogue:services");
  });

  it("re-lists a title whose copies came back", () => {
    expect(stockReturnedTags([book, book])).toEqual(["product:gitanjali", "catalogue:BOOK"]);
  });

  it("accepts only tags the taxonomy can produce", () => {
    for (const tag of [...ALL_TAGS, COVERS_TAG, "cms:menu", "catalogue:INDOOR_PLANT", "catalogue:services", "product:gitanjali"]) {
      expect(isAllowedTag(tag), tag).toBe(true);
    }
    for (const tag of ["", "cms:secrets", "catalogue:SHOES", "product:", "product:has space", "_N_T_/", "admin:order-stats"]) {
      expect(isAllowedTag(tag), tag).toBe(false);
    }
  });
});

describe("keys and env", () => {
  it("uses Redis only when asked to", () => {
    expect(cacheStore({})).toBe("default");
    expect(cacheStore({ CACHE_STORE: " Redis " })).toBe("redis");
  });

  it("namespaces every key by environment", () => {
    expect(cacheNamespace({})).toBe("dev");
    expect(entryKey("prod", "abc")).toBe("sfc:prod:e:abc");
    expect(tagKey("prod", "cms:faqs")).toBe("sfc:prod:t:cms:faqs");
  });

  it("reads the rate limiter's Upstash credentials", () => {
    expect(upstashConfig({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io/", UPSTASH_REDIS_REST_TOKEN: "t" })).toEqual({
      url: "https://x.upstash.io",
      token: "t",
    });
    expect(upstashConfig({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io" })).toBeNull();
  });

  it("refuses a Redis cache without credentials or a namespace", () => {
    expect(cacheConfigProblem({})).toBeNull();
    expect(cacheConfigProblem({ CACHE_STORE: "memcached" })).toMatch(/not a known cache store/);
    expect(cacheConfigProblem({ CACHE_STORE: "redis" })).toMatch(/UPSTASH_REDIS_REST_URL/);
    const credentials = { UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" };
    expect(cacheConfigProblem({ CACHE_STORE: "redis", ...credentials })).toMatch(/CACHE_NAMESPACE/);
    expect(cacheConfigProblem({ CACHE_STORE: "redis", CACHE_NAMESPACE: "prod", ...credentials })).toBeNull();
  });
});

describe("cachedQuery", () => {
  it("runs the query once, then serves the cached value with the call's tags and TTL", async () => {
    const query = vi.fn(async (slug: string) => ({ slug }));
    const read = cachedQuery({ name: "test-row", ttl: 300, tags: (slug: string) => [`product:${slug}`] }, query);

    expect(await read("a")).toEqual({ slug: "a" });
    reactScope.store.clear(); // a new request
    expect(await read("a")).toEqual({ slug: "a" });

    expect(query).toHaveBeenCalledTimes(1);
    expect(nextCache.calls[0]).toMatchObject({ tags: ["product:a"], revalidate: 300 });
    expect(nextCache.calls[0]!.keyParts[0]).toBe("test-row");
  });

  it("shares one lookup between identical calls in a request and between concurrent requests", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const query = vi.fn(async () => {
      await gate;
      return 42;
    });
    const read = cachedQuery({ name: "test-shared", ttl: 60, tags: ["cms"] }, query);

    const first = read();
    const sameRequest = read();
    reactScope.store.clear(); // a concurrent request
    const otherRequest = read();
    release();

    expect(await Promise.all([first, sameRequest, otherRequest])).toEqual([42, 42, 42]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(nextCache.calls).toHaveLength(1);
  });

  it("revives values on hits and misses alike", async () => {
    const read = cachedQuery(
      {
        name: "test-dates",
        ttl: 60,
        tags: ["catalogue"],
        revive: (row: { at: Date | string }) => ({ at: new Date(row.at) }),
      },
      async () => ({ at: new Date("2026-01-01T00:00:00Z") as Date | string })
    );
    const miss = await read();
    reactScope.store.clear();
    const hit = await read();
    expect(miss.at).toBeInstanceOf(Date);
    expect(hit.at).toBeInstanceOf(Date);
    expect((hit.at as Date).toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("caches nothing when the query fails", async () => {
    const query = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce("ok");
    const read = cachedQuery({ name: "test-error", ttl: 60, tags: ["cms"] }, query as () => Promise<string>);
    await expect(read()).rejects.toThrow("db down");
    reactScope.store.clear();
    expect(await read()).toBe("ok");
  });

  it("keys entries by the query's source, so changed code never reads old entries", async () => {
    const a = cachedQuery({ name: "test-version", ttl: 60, tags: [] }, async () => "a");
    const b = cachedQuery({ name: "test-version", ttl: 60, tags: [] }, async () => "b");
    expect(await a()).toBe("a");
    reactScope.store.clear();
    expect(await b()).toBe("b");
    expect(nextCache.calls[0]!.keyParts[1]).not.toBe(nextCache.calls[1]!.keyParts[1]);
  });

  it("counts lookups, misses, hits and shared calls", async () => {
    const read = cachedQuery({ name: "test-metrics", ttl: 60, tags: [] }, async () => 1);
    await read();
    reactScope.store.clear();
    await read();
    (globalThis as Record<symbol, unknown>)[STORE_STATS_KEY] = { l1Hits: 3 };

    const line = flushQuietly() as { event: string; caches: Record<string, Record<string, number>>; store: unknown };
    expect(line.event).toBe("cache.stats");
    expect(line.caches["test-metrics"]).toMatchObject({ lookups: 2, misses: 1, hits: 1, errors: 0, hitRatio: 0.5 });
    expect(line.store).toEqual({ l1Hits: 3 });
    expect(flushQuietly()).toBeNull();
  });
});

describe("writeTagLedger", () => {
  const credentials = () => {
    vi.stubEnv("CACHE_STORE", "redis");
    vi.stubEnv("CACHE_NAMESPACE", "test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://cache.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
  };

  it("does nothing unless the cache lives in Redis", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await writeTagLedger(["cms:faqs"])).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records each tag's invalidation time in one pipeline", async () => {
    credentials();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ result: "OK" }, { result: "OK" }])));
    vi.stubGlobal("fetch", fetchMock);

    expect(await writeTagLedger(["cms:faqs", "cms:faqs", "product:a"], 1_000)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cache.upstash.io/pipeline");
    expect(JSON.parse(init.body as string)).toEqual([
      ["SET", "sfc:test:t:cms:faqs", "1000", "EX", "86400"],
      ["SET", "sfc:test:t:product:a", "1000", "EX", "86400"],
    ]);
  });

  it("logs and reports a failed write without throwing", async () => {
    credentials();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await writeTagLedger(["cms:faqs"])).toBe(false);
    expect(error).toHaveBeenCalled();
  });
});
