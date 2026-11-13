import { beforeEach, describe, expect, it, vi } from "vitest";

// lib/stock.ts: what checkout expires after an order moves stock. The tag
// rules themselves are tested in packages/cache; this pins that checkout
// applies them, at once (`expire: 0`), and nothing more.

const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag }));

const { expireReturnedStock, expireTakenStock } = await import("@/lib/stock");

const book = { slug: "gitanjali", productLine: "BOOK" as const, type: "PHYSICAL_BOOK" as const };
const chart = { slug: "solar-system", productLine: "EDUCATIONAL_CHART" as const, type: "PHYSICAL_BOOK" as const };

const expired = () => revalidateTag.mock.calls.map(([tag, profile]) => [tag, profile]);

describe("checkout's cache expiry", () => {
  beforeEach(() => revalidateTag.mockReset());

  it("refreshes only the product page when plenty is left", () => {
    expireTakenStock([{ ...book, before: 50, quantity: 2 }]);
    expect(expired()).toEqual([["product:gitanjali", { expire: 0 }]]);
  });

  it("also re-lists a title the order left low on stock", () => {
    expireTakenStock([
      { ...book, before: 50, quantity: 2 },
      { ...chart, before: 3, quantity: 3 },
    ]);
    expect(expired()).toEqual([
      ["product:gitanjali", { expire: 0 }],
      ["product:solar-system", { expire: 0 }],
      ["catalogue:EDUCATIONAL_CHART", { expire: 0 }],
    ]);
  });

  it("refreshes pages and listings when a cancelled checkout puts copies back", () => {
    expireReturnedStock([book]);
    expect(expired()).toEqual([
      ["product:gitanjali", { expire: 0 }],
      ["catalogue:BOOK", { expire: 0 }],
    ]);
  });

  it("expires nothing for an order with no counted stock", () => {
    expireTakenStock([]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
