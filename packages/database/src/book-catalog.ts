/**
 * The Press's demo book catalogue.
 *
 * Emptied for the testing phase — real inventory is now entered from the
 * admin (`apps/admin/app/educational-material/books`) and read from
 * `Product`. The `BookSeed` shape and the `BOOK_SEEDS` export are kept so
 * the consumers that build on them still compile: `prisma/seed.ts` (writes
 * each seed into Postgres), `apps/web/lib/sample-data/books.ts` (the
 * storefront's offline fallback rows) and `apps/admin/lib/book-cover.ts`.
 * Re-populate `BOOK_SEEDS` here to restore a demo catalogue.
 *
 * Pure data — no Prisma import — so `BookSeed` can be referenced from
 * Client Components without pulling in the client.
 */

export interface BookSeed {
  id: string;
  slug: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  physicalPriceCents: number;
  ebookPriceCents: number;
  rating: number;
  reviewCount: number;
  stockQty: number;
  isbn: string;
  pages: number;
  coverFrom: string;
  coverTo: string;
  /**
   * Curated merchandising status shown in the admin Books list. Omitted for
   * an ordinary in-stock title. "COMING_SOON" titles are the ones the seed
   * raises sample purchase orders for (prisma/seed.ts) — a print run on
   * order but not yet received.
   */
  inventoryStatus?: "BEST_SELLING" | "COMING_SOON" | "OUT_OF_STOCK";
}

export const BOOK_SEEDS: BookSeed[] = [];
