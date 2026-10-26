/**
 * The server-side reads behind the books listing.
 *
 * Everything the page and `GET /api/books` need comes through two calls:
 *
 *   fetchBookPage({ query, cursor, limit })  -> one keyset page + nextCursor
 *   countBookListings(query)                 -> the "N titles" label, once
 *
 * Neither ever loads the whole catalogue. `fetchBookPage` returns at most
 * `limit` rows however many match, and resumes from a cursor rather than an
 * offset — so serving page 50,000 costs the same as page 1 (an index seek
 * plus 20 rows). `countBookListings` is one aggregate, run only on the
 * initial render, never per scroll.
 *
 * The Postgres branch below is what's live: real inventory added from the
 * admin is written to `Product` — see `packages/database/prisma/seed.ts` —
 * and every request reads from there, so a book added or hidden in the
 * admin appears on the next request with no redeploy. `withFallback()` (see
 * `lib/safe-fetch`) still falls back to the bundled sample catalogue in
 * `lib/sample-data` — built from `@repo/database`'s `book-catalog.ts`, whose
 * `BOOK_SEEDS` is empty during the testing phase, so that fallback renders
 * an empty catalogue until it is re-seeded. `docs/books-listing-scaling.md`
 * covers the index work that keeps this branch flat at 1M rows.
 *
 * Both reads are cached per (line, filters, cursor) under the `products`
 * tag (see `lib/products-cache`), so a repeat view or scroll page skips the
 * database entirely; an admin save expires them.
 */

import { prisma, type Prisma, type ProductLine } from "@repo/database";
import { withFallback } from "./safe-fetch";
import { productsCache, reviveDates } from "./products-cache";
import { applyFilters, sortListings } from "./books-filter";
import { bookToListing, type BookListing } from "./books";
import { decodeCursor, encodeCursor, paginateSorted, sortKey, type BookPage } from "./books-page";
import { SAMPLE_BOOKS } from "./sample-data";
import type { BookQuery } from "./books-query";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * `productLine` picks which Educational Materials line is listed — Books by
 * default; the charts / worksheets / teaching-materials pages pass theirs
 * (see `lib/product-lines`). The bundled sample catalogue is books only, so
 * the other lines fall back to an empty page rather than to sample books.
 */
export async function fetchBookPage({
  query,
  cursor,
  limit,
  productLine = "BOOK",
}: {
  query: BookQuery;
  cursor: string | null;
  limit: number;
  productLine?: ProductLine;
}): Promise<BookPage> {
  return withFallback(
    async () => {
      const page = await cachedBookPage(productLine, query, cursor, limit);
      return { ...page, items: page.items.map(reviveDates) };
    },
    productLine === "BOOK"
      ? paginateSorted(sampleMatches(query), cursor, limit, query.sort)
      : { items: [], nextCursor: null }
  );
}

export async function countBookListings(query: BookQuery, productLine: ProductLine = "BOOK"): Promise<number> {
  return withFallback(
    () => cachedBookCount(productLine, query),
    productLine === "BOOK" ? applyFilters(sampleListings(), query).length : 0
  );
}

const cachedBookPage = productsCache(
  "listing-page",
  (productLine: ProductLine, query: BookQuery, cursor: string | null, limit: number) =>
    fetchBookPageFromDb({ query, cursor, limit, productLine })
);

const cachedBookCount = productsCache("listing-count", (productLine: ProductLine, query: BookQuery) =>
  prisma.product.count({ where: buildBookWhere(query, productLine) })
);

// ---------------------------------------------------------------------------
// Sample catalogue (demo)
// ---------------------------------------------------------------------------

/** The sample catalogue never changes — build its listings once per process. */
let sampleListingsCache: BookListing[] | null = null;
function sampleListings(): BookListing[] {
  sampleListingsCache ??= SAMPLE_BOOKS.map(bookToListing);
  return sampleListingsCache;
}

function sampleMatches(query: BookQuery): BookListing[] {
  return sortListings(applyFilters(sampleListings(), query), query.sort);
}

// ---------------------------------------------------------------------------
// Postgres branch — one row per title, editions alongside (the shape the admin writes)
// ---------------------------------------------------------------------------

/**
 * One `Product` row per title with its `BookEdition`s included, so `LIMIT`
 * counts titles, not editions. Sorting and price bands run on
 * `Product.priceCents`, which for a book is its cheapest edition — kept in
 * step by the admin's product form and `prisma/seed.ts`.
 */
async function fetchBookPageFromDb({
  query,
  cursor,
  limit,
  productLine,
}: {
  query: BookQuery;
  cursor: string | null;
  limit: number;
  productLine: ProductLine;
}): Promise<BookPage> {
  const { dir } = sortKey(query.sort);
  const column: SortColumn = SORT_COLUMN[query.sort] ?? "createdAt";
  const decoded = decodeCursor(cursor);

  const where = buildBookWhere(query, productLine);
  const keyset: Prisma.ProductWhereInput | undefined = decoded
    ? {
        OR: [
          { [column]: dir === "asc" ? { gt: decoded.s } : { lt: decoded.s } },
          { [column]: decoded.s, id: dir === "asc" ? { gt: decoded.id } : { lt: decoded.id } },
        ],
      }
    : undefined;

  const rows = await prisma.product.findMany({
    where: keyset ? { AND: [where, keyset] } : where,
    orderBy: [{ [column]: dir }, { id: dir }] as Prisma.ProductOrderByWithRelationInput[],
    take: limit + 1,
    include: { editions: { select: { format: true, priceCents: true, stockQty: true } } },
  });

  const items = rows.slice(0, limit).map(bookToListing);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(last, query.sort) : null,
  };
}

type SortColumn = "priceCents" | "title" | "publishedAt" | "createdAt" | "ratingAvg" | "reviewCount";

const SORT_COLUMN: Record<string, SortColumn> = {
  price: "priceCents",
  "price-desc": "priceCents",
  title: "title",
  new: "publishedAt",
  rating: "ratingAvg",
  reviews: "reviewCount",
};

function buildBookWhere(query: BookQuery, productLine: ProductLine): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    // `productLine` keeps each Educational Materials line on its own page —
    // charts, worksheets and teaching materials are PHYSICAL_BOOK for
    // fulfilment but aren't books. Every real row carries its line (schema
    // backfill + the admin catalogue forms).
    { isPublished: true, type: { in: ["PHYSICAL_BOOK", "EBOOK"] }, productLine },
  ];

  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { author: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (productLine === "BOOK") {
    // A book's formats and stock live on its editions.
    const print: Prisma.BookEditionWhereInput = { format: { in: ["PAPERBACK", "HARDCOVER"] } };
    if (query.format === "print") and.push({ editions: { some: print } });
    if (query.format === "paperback") and.push({ editions: { some: { format: "PAPERBACK" } } });
    if (query.format === "hardcover") and.push({ editions: { some: { format: "HARDCOVER" } } });
    if (query.format === "ebook") and.push({ editions: { some: { format: "EBOOK" } } });
    if (query.classSet) and.push({ editions: { some: print } });
    if (query.avail === "same-day") and.push({ editions: { some: { ...print, stockQty: { gte: 30 } } } });
    if (query.avail === "in-stock") {
      // A null `stockQty` is "not tracked" — always orderable — and an
      // e-book never runs out.
      and.push({
        editions: { some: { OR: [{ format: "EBOOK" }, { ...print, stockQty: null }, { ...print, stockQty: { gt: 0 } }] } },
      });
    }
  } else {
    // The other lines are one shipped product each, stocked on the row.
    if (query.format === "ebook") and.push({ id: { in: [] } });
    if (query.avail === "same-day") and.push({ stockQty: { gte: 30 } });
    if (query.avail === "in-stock") and.push({ OR: [{ stockQty: { gt: 0 } }, { stockQty: null }] });
  }
  if (query.price === "lt1500") and.push({ priceCents: { lt: 150000 } });
  if (query.price === "1500-2500") and.push({ priceCents: { gte: 150000, lte: 250000 } });
  if (query.price === "gt2500") and.push({ priceCents: { gt: 250000 } });
  if (query.genres.length) and.push({ genre: { in: query.genres } });
  if (query.rating) and.push({ ratingAvg: { gte: Number(query.rating) } });

  return { AND: and };
}
