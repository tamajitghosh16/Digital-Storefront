import "server-only";
import { cachedQuery } from "@repo/cache/query";
import { TTL } from "@repo/cache/policy";
import type { Product } from "@repo/database";

/**
 * Cached catalogue reads — product listings, detail lookups, related rows,
 * the homepage's product rows, the services list, cart covers.
 *
 * Why: the shared Postgres is a pooler a round trip away, so a listing
 * page's two queries cost the shopper real time before the first byte, for
 * data that only changes when staff save it in apps/admin or an order moves
 * stock.
 *
 * Every reader names its tags (packages/cache/src/tags.ts): listings carry
 * `catalogue:<line>`, single products also `product:<slug>`. apps/admin
 * expires the tags of what it saved, and checkout expires only the product
 * pages whose stock moved (lib/stock.ts), so one edit or one order no
 * longer empties the whole catalogue. `TTL.catalogue` is the backstop for a
 * lost signal.
 *
 * Still read live, never through here: anything per-user (wishlist,
 * library, orders) and everything checkout prices or stock-checks a charge
 * from — `startCheckout` re-reads each `Product` itself, so a cached price
 * or stock figure can never reach a payment.
 *
 * Values round-trip through JSON, so `Date` columns come back as strings;
 * {@link reviveProduct} / {@link reviveDates} turn them back into Dates.
 */
export function productsCache<A extends unknown[], R>(
  name: string,
  // `NoInfer`: the arguments come from the query; the tags function may take fewer.
  tags: NoInfer<(...args: A) => readonly string[]>,
  query: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return cachedQuery({ name: `products:${name}`, ttl: TTL.catalogue, tags }, query);
}

type DateFields = "publishedAt" | "createdAt" | "updatedAt";

/** Restores the named `Date` fields a JSON round trip turned into strings. */
export function reviveDates<T extends Partial<Record<DateFields, Date | null>>>(row: T): T {
  const copy: Record<string, unknown> = { ...row };
  for (const field of ["publishedAt", "createdAt", "updatedAt"] as const) {
    const value = copy[field];
    if (typeof value === "string") copy[field] = new Date(value);
  }
  return copy as T;
}

export function reviveProduct(row: Product): Product;
export function reviveProduct(row: Product | null): Product | null;
export function reviveProduct(row: Product | null): Product | null {
  return row ? reviveDates(row) : null;
}
