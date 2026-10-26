import "server-only";
import { unstable_cache } from "next/cache";
import type { Product } from "@repo/database";

/**
 * Cached catalogue reads — product listings, detail lookups and the
 * homepage's product rows.
 *
 * Why: the shared Postgres is a Supabase pooler in another region, so a
 * listing page's two queries cost the shopper ~2s before the first byte.
 * Products change only when staff save them in apps/admin, so they're
 * cached the same way `lib/cms.ts` caches CMS data: every entry carries
 * {@link PRODUCTS_CACHE_TAG}, apps/admin's product Server Actions ping this
 * app's `/api/revalidate` after each save (apps/admin/lib/storefront-cache.ts),
 * and that expires the tag at once. {@link PRODUCTS_REVALIDATE_SECONDS} is
 * only the backstop for when the ping never arrives.
 *
 * Still read live, never through here: anything per-user (wishlist,
 * library, orders) and everything checkout prices or stock-checks a charge
 * from — `startCheckout` re-reads each `Product` itself, so a cached price
 * or stock figure can never reach a payment.
 *
 * `unstable_cache` round-trips values through JSON, so `Date` columns come
 * back as strings; {@link reviveProduct} / {@link reviveDates} turn them
 * back into Dates for callers.
 */

export const PRODUCTS_CACHE_TAG = "products";
const PRODUCTS_REVALIDATE_SECONDS = 60;

export function productsCache<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) {
  return unstable_cache(fn, ["products", key], {
    tags: [PRODUCTS_CACHE_TAG],
    revalidate: PRODUCTS_REVALIDATE_SECONDS,
  });
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
