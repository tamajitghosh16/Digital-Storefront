import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import contract from "./storefront-revalidate.contract.json";

// Consumer side of the admin → storefront contract: what revalidateStorefront()
// actually sends must be exactly what the contract says. apps/web's provider
// test replays the same file against its route, so neither side can change
// the call without the other's tests failing.

const SECRET = "contract-test-secret";
const STOREFRONT = "https://storefront.example.test";

// `after()` needs a live request; run the scheduled work straight away instead.
const scheduled = vi.hoisted(() => [] as Promise<unknown>[]);
vi.mock("next/server", () => ({ after: (task: () => Promise<unknown>) => void scheduled.push(task()) }));
const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag }));

const { revalidateStorefront } = await import("@/lib/storefront-cache");

type Interaction = {
  name: string;
  request: { method: string; path: string; headers: Record<string, string>; body?: { tags: string[]; productIds: string[] } };
  response: { status: number; body?: object };
};

const interactions = contract.interactions as Interaction[];
const sentByThisAdmin = interactions.filter((interaction) => interaction.request.body && interaction.response.status === 200);

describe("admin → storefront cache ping (consumer)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_STOREFRONT_URL", STOREFRONT);
    vi.stubEnv("CACHE_STORE", "");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    revalidateTag.mockReset();
    scheduled.length = 0;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  for (const interaction of sentByThisAdmin) {
    it(`sends "${interaction.name}" as the contract describes`, async () => {
      fetchMock.mockResolvedValue(Response.json(interaction.response.body, { status: interaction.response.status }));
      const { tags, productIds } = interaction.request.body!;

      revalidateStorefront(tags, productIds);
      await Promise.all(scheduled);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [target, init] = fetchMock.mock.calls[0]!;
      const url = new URL(String(target));
      expect(url.origin).toBe(STOREFRONT);
      expect(url.pathname).toBe(interaction.request.path);
      expect(init?.method).toBe(interaction.request.method);
      const headers = new Headers(init?.headers);
      for (const [name, value] of Object.entries(interaction.request.headers)) {
        expect(headers.get(name)).toBe(value.replace("{{secret}}", SECRET));
      }
      expect(JSON.parse(String(init?.body))).toEqual(interaction.request.body);
    });
  }

  it("expires the same tags in admin's own cache at once", () => {
    fetchMock.mockResolvedValue(Response.json({ revalidated: true }));
    revalidateStorefront(["cms:settings", "cms:settings", "cms:menu"]);

    expect(revalidateTag.mock.calls).toEqual([
      ["cms:settings", { expire: 0 }],
      ["cms:menu", { expire: 0 }],
    ]);
  });

  it("also records the invalidation straight in the storefront's Redis when it uses one", async () => {
    vi.stubEnv("CACHE_STORE", "redis");
    vi.stubEnv("CACHE_NAMESPACE", "prod");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://cache.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    fetchMock.mockImplementation(async (target) =>
      String(target).startsWith("https://cache.upstash.io")
        ? Response.json([{ result: "OK" }])
        : Response.json({ revalidated: true })
    );

    revalidateStorefront(["cms:faqs"]);
    await Promise.all(scheduled);

    const ledger = fetchMock.mock.calls.find(([target]) => String(target) === "https://cache.upstash.io/pipeline");
    expect(JSON.parse(String(ledger![1]?.body))).toEqual([
      ["SET", "sfc:prod:t:cms:faqs", expect.stringMatching(/^\d+$/), "EX", "86400"],
    ]);
    expect(fetchMock.mock.calls.some(([target]) => String(target) === `${STOREFRONT}/api/revalidate`)).toBe(true);
  });

  it("treats a refused ping as non-fatal, so a save never fails on it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    revalidateStorefront(["cms:faqs"]);

    await expect(Promise.all(scheduled)).resolves.toBeDefined();
  });

  it("sends nothing unless both the secret and the storefront URL are set", async () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "");

    revalidateStorefront(["cms:faqs"]);
    await Promise.all(scheduled);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing for an empty change", () => {
    revalidateStorefront([]);
    expect(scheduled).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
