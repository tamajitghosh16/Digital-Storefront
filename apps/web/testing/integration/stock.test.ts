import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@repo/database";
import { resetTestDatabase, testDatabaseUrl } from "@repo/database/testing";
import { createBook, createChart } from "./support/fixtures";

// takeStock/returnStock (lib/stock.ts) against real rows and transactions.
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const { OutOfStockError, returnStock, takeStock } = await import("@/lib/stock");

const paperbackStock = async (productId: string) =>
  (await prisma.bookEdition.findUniqueOrThrow({ where: { productId_format: { productId, format: "PAPERBACK" } } }))
    .stockQty;

describe.skipIf(!testDatabaseUrl())("stock", () => {
  beforeEach(() => resetTestDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  it("takes copies off a book edition and a counted product", async () => {
    const book = await createBook({ paperback: 5 });
    const chart = await createChart(3);

    await prisma.$transaction((tx) =>
      takeStock(tx, [
        { productId: book.id, bookFormat: "PAPERBACK", quantity: 2 },
        { productId: chart.id, bookFormat: null, quantity: 3 },
      ])
    );

    expect(await paperbackStock(book.id)).toBe(3);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: chart.id } })).stockQty).toBe(0);
  });

  it("rolls the whole transaction back when one line has sold out", async () => {
    const book = await createBook({ paperback: 5 });
    const chart = await createChart(1);

    await expect(
      prisma.$transaction((tx) =>
        takeStock(tx, [
          { productId: book.id, bookFormat: "PAPERBACK", quantity: 2 },
          { productId: chart.id, bookFormat: null, quantity: 2 },
        ])
      )
    ).rejects.toBeInstanceOf(OutOfStockError);

    // The book line that did succeed was undone with it.
    expect(await paperbackStock(book.id)).toBe(5);
  });

  it("lets only one of two shoppers have the last copy", async () => {
    const book = await createBook({ paperback: 1 });
    const buy = () =>
      prisma.$transaction((tx) => takeStock(tx, [{ productId: book.id, bookFormat: "PAPERBACK", quantity: 1 }]));

    const results = await Promise.allSettled([buy(), buy()]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await paperbackStock(book.id)).toBe(0);
  });

  it("leaves untracked stock alone", async () => {
    const chart = await createChart(null);

    await prisma.$transaction((tx) => takeStock(tx, [{ productId: chart.id, bookFormat: null, quantity: 50 }]));

    expect((await prisma.product.findUniqueOrThrow({ where: { id: chart.id } })).stockQty).toBeNull();
  });

  it("puts a cancelled order's copies back", async () => {
    const book = await createBook({ paperback: 1 });

    await prisma.$transaction((tx) => returnStock(tx, [{ productId: book.id, bookFormat: "PAPERBACK", quantity: 2 }]));

    expect(await paperbackStock(book.id)).toBe(3);
  });
});
