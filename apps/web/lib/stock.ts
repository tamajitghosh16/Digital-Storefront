import "server-only";
import { revalidateTag } from "next/cache";
import type { StockLine } from "@repo/database";
import { PRODUCTS_CACHE_TAG } from "./products-cache";

// The stock arithmetic itself lives in @repo/database (src/stock.ts), shared
// with apps/admin, which returns a refused sales order's copies.
export { OutOfStockError, returnStock, takeStock, type StockLine } from "@repo/database";

/**
 * Listings and product pages cache stock figures (lib/products-cache.ts);
 * after an order moves one, expire them so the next shopper sees what's
 * actually left rather than waiting out the 60s backstop.
 */
export function expireCachedStock(lines: StockLine[]): void {
  if (lines.length) revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
}
