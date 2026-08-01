// Static sample content for previewing the storefront without a live
// Supabase/Postgres connection. Nothing here is written to the database —
// pages fall back to it only when the real `prisma` call throws (no
// DATABASE_URL reachable) or returns an empty result.
//
// Remove this folder once the admin app has real content and
// `npm run seed --workspace=@repo/database` has been run against a live DB.

import { SAMPLE_BOOKS, SAMPLE_EBOOKS } from "./books";
import { SAMPLE_SERVICES } from "./services";
import type { DisplayProduct } from "./shared";

export * from "./shared";
export * from "./books";
export * from "./services";
export * from "./cms";
export * from "./account";

/** Every sample listing, in the order the storefront surfaces them. */
export const SAMPLE_PRODUCTS: DisplayProduct[] = [...SAMPLE_BOOKS, ...SAMPLE_EBOOKS, ...SAMPLE_SERVICES];

export function findSampleProduct(slug: string): DisplayProduct | undefined {
  return SAMPLE_PRODUCTS.find((product) => product.slug === slug);
}

/** Homepage category grid — mirrors the four trading lines. */
export const SAMPLE_CATEGORIES = [
  { title: "Books", body: "Printed titles, shipped to you", href: "/books" },
  { title: "E-Books", body: "Instant digital delivery", href: "/ebooks" },
  { title: "Publishing Services", body: "E-book creation & formatting", href: "/services" },
  { title: "Self-Publishing", body: "Publish your own book with us", href: "/self-publishing" },
];
