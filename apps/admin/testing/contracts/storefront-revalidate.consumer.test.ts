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

const { revalidateStorefront } = await import("@/lib/storefront-cache");

const [ok] = contract.interactions;

describe("admin → storefront cache ping (consumer)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_STOREFRONT_URL", STOREFRONT);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    scheduled.length = 0;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it(`sends "${ok!.name}" as the contract describes`, async () => {
    fetchMock.mockResolvedValue(Response.json(ok!.response.body, { status: ok!.response.status }));

    revalidateStorefront();
    await Promise.all(scheduled);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0]!;
    const url = new URL(String(target));
    expect(url.origin).toBe(STOREFRONT);
    expect(url.pathname).toBe(ok!.request.path);
    expect(init?.method).toBe(ok!.request.method);
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      ok!.request.headers.Authorization.replace("{{secret}}", SECRET)
    );
  });

  it("treats a refused ping as non-fatal, so a save never fails on it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    revalidateStorefront();

    await expect(Promise.all(scheduled)).resolves.toBeDefined();
  });

  it("sends nothing unless both the secret and the storefront URL are set", () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "");

    revalidateStorefront();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
