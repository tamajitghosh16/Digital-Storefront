// Static sample content for previewing the storefront without a live
// Supabase/Postgres connection. Nothing here is written to the database —
// pages fall back to it only when the real `prisma` call throws (no
// DATABASE_URL reachable) or returns an empty result.
//
// Remove this folder once the admin app has real content and
// `npm run seed --workspace=@repo/database` has been run against a live DB.

import type { Product } from "@repo/database";

export const NOW = new Date();

/** Fields every sample product row needs to satisfy the Prisma `Product` type. */
export function baseProductFields(overrides: Partial<Product> = {}) {
  return {
    currency: "INR",
    weightGrams: null,
    sourceProjectId: null,
    metaTitle: null,
    metaDescription: null,
    ogImageUrl: null,
    isPublished: true,
    publishedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Display-only fields the catalogue UI needs that the schema doesn't carry. */
export type DisplayProduct = Product & {
  genre: string;
  /** Average out of 5, to one decimal — the detail page shows it as such. */
  rating: number;
  reviewCount: number;
  pages: number | null;
  coverFrom: string;
  coverTo: string;
};
