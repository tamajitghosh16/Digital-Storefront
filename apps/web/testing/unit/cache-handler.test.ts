import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sharedKeys from "@repo/cache/keys";
import RedisCacheHandler, {
  ENTRY_MAX_TTL_SECONDS,
  KEY_PREFIX,
  TAG_TTL_SECONDS,
  __resetForTests,
  entryKey,
  tagKey,
} from "../../cache-handler.mjs";

// apps/web/cache-handler.mjs — the Redis-backed Next data cache used when
// CACHE_STORE=redis — against an in-memory stand-in for Upstash's REST API.

const STATS = Symbol.for("repo.cache.storeStats");

type Command = string[];

function fakeUpstash() {
  const store = new Map<string, string>();
  const pipelines: Command[][] = [];
  let down = false;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    if (down) throw new Error("connect ECONNREFUSED");
    const commands = JSON.parse(String(init.body)) as Command[];
    pipelines.push(commands);
    const results = commands.map(([name, ...args]) => {
      if (name === "GET") return { result: store.get(args[0]!) ?? null };
      if (name === "MGET") return { result: args.map((key) => store.get(key) ?? null) };
      if (name === "SET") {
        store.set(args[0]!, args[1]!);
        return { result: "OK" };
      }
      return { error: `unknown command ${name}` };
    });
    return new Response(JSON.stringify(results));
  });
  return {
    store,
    pipelines,
    fetchMock,
    setDown: (value: boolean) => {
      down = value;
    },
  };
}

const fetchValue = (body: unknown, tags: string[]) => ({
  kind: "FETCH",
  data: { headers: {}, body: JSON.stringify(body), status: 200, url: "" },
  revalidate: 300,
  tags,
});

const ctx = (tags: string[], softTags: string[] = []) => ({ kind: "FETCH", tags, softTags });

let upstash: ReturnType<typeof fakeUpstash>;
let handler: RedisCacheHandler;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(1_000_000);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://cache.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
  vi.stubEnv("CACHE_NAMESPACE", "test");
  upstash = fakeUpstash();
  vi.stubGlobal("fetch", upstash.fetchMock);
  __resetForTests();
  (globalThis as Record<symbol, unknown>)[STATS] = {};
  handler = new RedisCacheHandler();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A cold process sharing the same Redis: module state forgotten, the store kept. */
function restartProcess() {
  __resetForTests();
  handler = new RedisCacheHandler();
}

async function store(key: string, tags: string[], body: unknown = { ok: true }) {
  await handler.get(key, ctx(tags)); // the lookup that missed
  await handler.set(key, fetchValue(body, tags), { tags, fetchCache: true });
}

describe("key scheme", () => {
  it("matches packages/cache/src/keys.ts, which apps/admin writes with", () => {
    expect(KEY_PREFIX).toBe(sharedKeys.KEY_PREFIX);
    expect(TAG_TTL_SECONDS).toBe(sharedKeys.TAG_TTL_SECONDS);
    expect(ENTRY_MAX_TTL_SECONDS).toBe(sharedKeys.ENTRY_MAX_TTL_SECONDS);
    expect(entryKey("prod", "k")).toBe(sharedKeys.entryKey("prod", "k"));
    expect(tagKey("prod", "cms:faqs")).toBe(sharedKeys.tagKey("prod", "cms:faqs"));
  });
});

describe("RedisCacheHandler", () => {
  it("misses, stores in Redis with a TTL, then serves from memory without a round trip", async () => {
    expect(await handler.get("k1", ctx(["cms", "cms:faqs"]))).toBeNull();
    await handler.set("k1", fetchValue({ faqs: 3 }, ["cms", "cms:faqs"]), { tags: ["cms", "cms:faqs"], fetchCache: true });

    const set = upstash.pipelines.at(-1)!;
    expect(set[0]!.slice(0, 2)).toEqual(["SET", "sfc:test:e:k1"]);
    expect(set[0]!.slice(3)).toEqual(["EX", "600"]);

    const calls = upstash.fetchMock.mock.calls.length;
    const hit = await handler.get("k1", ctx(["cms", "cms:faqs"]));
    expect(JSON.parse(hit!.value.data.body)).toEqual({ faqs: 3 });
    expect(upstash.fetchMock.mock.calls.length).toBe(calls); // tags checked <1s ago, entry in L1
  });

  it("shares entries between processes through Redis", async () => {
    await store("k2", ["catalogue", "catalogue:BOOK"], { books: 10 });
    restartProcess();

    const hit = await handler.get("k2", ctx(["catalogue", "catalogue:BOOK"]));
    expect(JSON.parse(hit!.value.data.body)).toEqual({ books: 10 });
    expect((globalThis as Record<symbol, Record<string, number>>)[STATS]!.redisHits).toBe(1);
  });

  it("drops an entry whose tag another process (or apps/admin) invalidated, within a second", async () => {
    await store("k3", ["catalogue", "product:gitanjali"]); // tags checked at t=1_000_000

    vi.setSystemTime(1_000_200);
    upstash.store.set(tagKey("test", "product:gitanjali"), String(Date.now())); // apps/admin's ledger write

    // Inside the 1s memo window this process hasn't looked yet…
    vi.setSystemTime(1_000_800);
    expect(await handler.get("k3", ctx(["catalogue", "product:gitanjali"]))).not.toBeNull();
    // …and once it has expired, the tag is re-read and the entry dropped.
    vi.setSystemTime(1_001_200);
    expect(await handler.get("k3", ctx(["catalogue", "product:gitanjali"]))).toBeNull();
  });

  it("after an invalidation, takes another process's rebuilt entry from Redis instead of re-querying", async () => {
    await store("k10", ["cms", "cms:faqs"], { faqs: "old" }); // this process holds the old copy

    // Another process sees the save first and stores the rebuilt entry.
    vi.setSystemTime(1_060_000);
    upstash.store.set(tagKey("test", "cms:faqs"), String(Date.now()));
    vi.setSystemTime(1_061_000); // its page view, a moment after the save
    upstash.store.set(
      entryKey("test", "k10"),
      JSON.stringify({ lastModified: Date.now(), value: fetchValue({ faqs: "new" }, ["cms", "cms:faqs"]), tags: ["cms", "cms:faqs"] })
    );

    vi.setSystemTime(1_062_500); // our tag memo has expired
    const hit = await handler.get("k10", ctx(["cms", "cms:faqs"]));
    expect(JSON.parse(hit!.value.data.body)).toEqual({ faqs: "new" });
    const counts = (globalThis as Record<symbol, Record<string, number>>)[STATS]!;
    expect(counts.tagExpired).toBe(1);
    expect(counts.misses ?? 0).toBe(1); // only the original cold lookup
  });

  it("keeps an entry when an unrelated tag changes", async () => {
    await store("k4", ["catalogue", "catalogue:BOOK"]);
    vi.setSystemTime(1_010_000);
    upstash.store.set(tagKey("test", "cms:faqs"), String(Date.now()));
    expect(await handler.get("k4", ctx(["catalogue", "catalogue:BOOK"]))).not.toBeNull();
  });

  it("expires at once in this process and records the invalidation for the others", async () => {
    await store("k5", ["cms", "cms:menu"]);
    vi.setSystemTime(1_020_000);
    await handler.revalidateTag(["cms:menu"]);

    expect(upstash.store.get(tagKey("test", "cms:menu"))).toBe(String(1_020_000));
    expect(await handler.get("k5", ctx(["cms", "cms:menu"]))).toBeNull();

    restartProcess();
    vi.setSystemTime(1_020_100);
    expect(await handler.get("k5", ctx(["cms", "cms:menu"]))).toBeNull();
  });

  it("never stores a result that raced an invalidation as fresh", async () => {
    // A lookup misses and the query starts reading the database…
    await handler.get("k6", ctx(["catalogue:BOOK"]));
    // …staff save while it runs…
    vi.setSystemTime(1_030_000);
    await handler.revalidateTag("catalogue:BOOK");
    // …and the now-stale result is stored afterwards.
    vi.setSystemTime(1_030_500);
    await handler.set("k6", fetchValue({ stale: true }, ["catalogue:BOOK"]), { tags: ["catalogue:BOOK"], fetchCache: true });

    expect(await handler.get("k6", ctx(["catalogue:BOOK"]))).toBeNull();
    expect(upstash.store.has(entryKey("test", "k6"))).toBe(false);
  });

  it("checks implicit path tags only against this process's revalidatePath calls", async () => {
    await store("k7", ["cms"]);
    vi.setSystemTime(1_040_000);
    await handler.revalidateTag("_N_T_/services");
    expect(await handler.get("k7", ctx(["cms"], ["_N_T_/services"]))).toBeNull();
  });

  it("degrades to the database when Redis is down, serving what it already holds", async () => {
    await store("k8", ["cms"]);
    upstash.setDown(true);
    vi.setSystemTime(1_050_000); // tag memo stale: a Redis round trip is attempted and fails

    const hit = await handler.get("k8", ctx(["cms"]));
    expect(hit).not.toBeNull(); // from memory
    expect(await handler.get("cold", ctx(["cms"]))).toBeNull(); // nothing held: a plain miss
  });

  it("opens a breaker after repeated failures and logs it once", async () => {
    upstash.setDown(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    for (let i = 0; i < 5; i += 1) expect(await handler.get(`x${i}`, ctx(["cms"]))).toBeNull();

    expect(upstash.fetchMock).toHaveBeenCalledTimes(3); // then skipped while open
    expect(warn.mock.calls.filter(([line]) => String(line).includes("cache.store_unavailable"))).toHaveLength(1);

    upstash.setDown(false);
    vi.setSystemTime(1_000_000 + 31_000); // breaker closes after 30s
    await handler.get("x9", ctx(["cms"]));
    expect(upstash.fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps non-data entries (sitemap, robots) in this process only", async () => {
    await handler.set("/sitemap.xml", { kind: "APP_ROUTE", body: "<urlset/>" }, {});
    expect(await handler.get("/sitemap.xml", { kind: "APP_ROUTE" })).toMatchObject({ value: { kind: "APP_ROUTE" } });
    expect(upstash.fetchMock).not.toHaveBeenCalled();
  });

  it("caches in this process only, with a warning, when the Upstash credentials are missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    restartProcess();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await store("k9", ["cms"]);
    expect(await handler.get("k9", ctx(["cms"]))).not.toBeNull();
    expect(upstash.fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
