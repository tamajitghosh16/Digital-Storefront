import "server-only";
import { revalidateTag } from "next/cache";
import type { BookFormat, Prisma } from "@repo/database";
import { PRODUCTS_CACHE_TAG } from "./products-cache";

/**
 * Taking counted stock off the shelf when an order is placed, and putting it
 * back when that order is cancelled.
 *
 * A shipped line draws on one of two counters: a book's printed
 * `BookEdition.stockQty` (the line names its `bookFormat`), or the row's own
 * `Product.stockQty` for everything else (charts, worksheets, teaching
 * aids). A null counter means staff aren't counting that item — always
 * orderable, never touched here.
 *
 * Each deduction is a conditional `stockQty >= quantity` update, so two
 * shoppers racing for the last copies can't both win: the second one's
 * update matches no row and the whole order rolls back. Run it inside the
 * transaction that creates the order, so the order and the deduction land
 * or fail together.
 */

export type StockLine = { productId: string; bookFormat: BookFormat | null; quantity: number };

/** Thrown from inside the order transaction when a line has sold out since the cart was checked. */
export class OutOfStockError extends Error {
  constructor(readonly line: StockLine) {
    super(`Not enough stock for ${line.productId}${line.bookFormat ? ` (${line.bookFormat})` : ""}`);
    this.name = "OutOfStockError";
  }
}

/**
 * Same rows in the same order in every transaction, so two orders sharing
 * items lock them in turn rather than deadlocking on each other.
 */
function lockOrder(lines: StockLine[]): StockLine[] {
  const key = (line: StockLine) => `${line.productId}:${line.bookFormat ?? ""}`;
  return [...lines].sort((a, b) => key(a).localeCompare(key(b)));
}

export async function takeStock(tx: Prisma.TransactionClient, lines: StockLine[]): Promise<void> {
  for (const line of lockOrder(lines)) {
    const enough = { stockQty: { gte: line.quantity } };
    const decrement = { stockQty: { decrement: line.quantity } };
    const { count } = line.bookFormat
      ? await tx.bookEdition.updateMany({
          where: { productId: line.productId, format: line.bookFormat, ...enough },
          data: decrement,
        })
      : await tx.product.updateMany({ where: { id: line.productId, ...enough }, data: decrement });
    if (count === 1) continue;

    // Nothing matched: too few left — or staff stopped counting this item
    // since checkout read it, in which case there's nothing to take.
    const current = line.bookFormat
      ? await tx.bookEdition.findUnique({
          where: { productId_format: { productId: line.productId, format: line.bookFormat } },
          select: { stockQty: true },
        })
      : await tx.product.findUnique({ where: { id: line.productId }, select: { stockQty: true } });
    if (current && current.stockQty === null) continue;
    throw new OutOfStockError(line);
  }
}

/** Puts a cancelled order's copies back. A counter staff have since stopped tracking stays untracked. */
export async function returnStock(tx: Prisma.TransactionClient, lines: StockLine[]): Promise<void> {
  for (const line of lockOrder(lines)) {
    const counted = { stockQty: { not: null } };
    const increment = { stockQty: { increment: line.quantity } };
    if (line.bookFormat) {
      await tx.bookEdition.updateMany({
        where: { productId: line.productId, format: line.bookFormat, ...counted },
        data: increment,
      });
    } else {
      await tx.product.updateMany({ where: { id: line.productId, ...counted }, data: increment });
    }
  }
}

/**
 * Listings and product pages cache stock figures (lib/products-cache.ts);
 * after an order moves one, expire them so the next shopper sees what's
 * actually left rather than waiting out the 60s backstop.
 */
export function expireCachedStock(lines: StockLine[]): void {
  if (lines.length) revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
}
