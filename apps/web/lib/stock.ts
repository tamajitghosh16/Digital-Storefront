import "server-only";
import { revalidateTag } from "next/cache";
import { stockReturnedTags, stockTakenTags, type ProductRef, type StockMove } from "@repo/cache/tags";

// The stock arithmetic itself lives in @repo/database (src/stock.ts), shared
// with apps/admin, which returns a refused sales order's copies.
export { OutOfStockError, returnStock, takeStock, type StockLine } from "@repo/database";

/**
 * Listings and product pages cache stock figures (lib/products-cache.ts).
 * After an order takes copies, expire the pages whose figures moved: each
 * product's own page always, and its listing only when the tile would now
 * read differently (low stock, sold out, no longer same-day) — see
 * `stockTakenTags` in packages/cache/src/tags.ts. Expired at once
 * (`expire: 0`), not served stale, so the next shopper sees what's left.
 */
export function expireTakenStock(moves: readonly StockMove[]): void {
  for (const tag of stockTakenTags(moves)) revalidateTag(tag, { expire: 0 });
}

/** After copies go back on the shelf (a cancelled checkout): the products' pages and listings. */
export function expireReturnedStock(products: readonly ProductRef[]): void {
  for (const tag of stockReturnedTags(products)) revalidateTag(tag, { expire: 0 });
}
