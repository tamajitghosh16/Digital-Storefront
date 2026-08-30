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
 * The Postgres branch below is what's live: real inventory (the 100-title
 * demo catalogue plus anything added from the admin) is seeded into
 * `Product` — see `packages/database/prisma/seed.ts` — and every request
 * reads from there, so a book added or hidden in the admin appears on the
 * next request with no redeploy. `withFallback()` (see `lib/safe-fetch`)
 * still falls back to the bundled sample catalogue in `lib/sample-data` —
 * built from the very same seed file, `@repo/database`'s
 * `book-catalog.ts` — if the database is unreachable, so a fresh checkout
 * with no `DATABASE_URL` still renders. `docs/books-listing-scaling.md`
 * covers the index work that keeps this branch flat at 1M rows.
 */

import { prisma, type Prisma, type Product } from "@repo/database";
import { withFallback } from "./safe-fetch";
import { applyFilters, sortListings } from "./books-filter";
import { groupBookEditions, type BookListing } from "./books";
import { decodeCursor, encodeCursor, paginateSorted, sortKey, type BookPage } from "./books-page";
import { SAMPLE_BOOKS, SAMPLE_EBOOKS } from "./sample-data";
import type { BookQuery } from "./books-query";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchBookPage({
  query,
  cursor,
  limit,
}: {
  query: BookQuery;
  cursor: string | null;
  limit: number;
}): Promise<BookPage> {
  return withFallback(
    () => fetchBookPageFromDb({ query, cursor, limit }),
    paginateSorted(sampleMatches(query), cursor, limit, query.sort)
  );
}

export async function countBookListings(query: BookQuery): Promise<number> {
  return withFallback(
    () => prisma.product.count({ where: buildBookWhere(query) }),
    applyFilters(sampleListings(), query).length
  );
}

// ---------------------------------------------------------------------------
// Sample catalogue (demo)
// ---------------------------------------------------------------------------

/** The grouped sample catalogue never changes — build it once per process. */
let sampleListingsCache: BookListing[] | null = null;
function sampleListings(): BookListing[] {
  sampleListingsCache ??= groupBookEditions([...SAMPLE_BOOKS, ...SAMPLE_EBOOKS]);
  return sampleListingsCache;
}

function sampleMatches(query: BookQuery): BookListing[] {
  return sortListings(applyFilters(sampleListings(), query), query.sort);
}

// ---------------------------------------------------------------------------
// Postgres branch — one row per title (the shape the admin writes)
// ---------------------------------------------------------------------------

/**
 * NOTE: assumes the single-row book model — `bookFormats: [PHYSICAL, EBOOK]`
 * with `priceCents` + `ebookPriceCents` on one row — so `LIMIT` counts
 * titles, not editions. That's the shape both the admin's product form and
 * `prisma/seed.ts` write.
 */
async function fetchBookPageFromDb({
  query,
  cursor,
  limit,
}: {
  query: BookQuery;
  cursor: string | null;
  limit: number;
}): Promise<BookPage> {
  const { dir } = sortKey(query.sort);
  const column: SortColumn = SORT_COLUMN[query.sort] ?? "createdAt";
  const decoded = decodeCursor(cursor);

  const where = buildBookWhere(query);
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
  });

  const items = rows.slice(0, limit).map(rowToListing);
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

function buildBookWhere(query: BookQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    // `productLine: "BOOK"` keeps the other Educational Materials lines
    // (charts, worksheets, teaching materials) out of the books listing —
    // they're PHYSICAL_BOOK for fulfilment but aren't books. Every real
    // book row carries "BOOK" (schema backfill + the admin catalogue form).
    { isPublished: true, type: { in: ["PHYSICAL_BOOK", "EBOOK"] }, productLine: "BOOK" },
  ];

  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { author: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.format === "print") and.push({ bookFormats: { has: "PHYSICAL" } });
  if (query.format === "ebook") and.push({ bookFormats: { has: "EBOOK" } });
  if (query.classSet) and.push({ bookFormats: { has: "PHYSICAL" } });
  if (query.avail === "same-day") and.push({ stockQty: { gte: 30 } });
  if (query.avail === "in-stock") {
    and.push({ OR: [{ stockQty: { gt: 0 } }, { bookFormats: { has: "EBOOK" } }] });
  }
  if (query.price === "lt1500") and.push({ priceCents: { lt: 150000 } });
  if (query.price === "1500-2500") and.push({ priceCents: { gte: 150000, lte: 250000 } });
  if (query.price === "gt2500") and.push({ priceCents: { gt: 250000 } });
  if (query.genres.length) and.push({ genre: { in: query.genres } });
  if (query.rating) and.push({ ratingAvg: { gte: Number(query.rating) } });

  return { AND: and };
}

function rowToListing(row: Product): BookListing {
  const hasEbook = row.bookFormats.includes("EBOOK") || row.type === "EBOOK";
  const hasPrint = row.bookFormats.includes("PHYSICAL") || row.type === "PHYSICAL_BOOK";
  const prices = [row.priceCents, row.ebookPriceCents].filter(
    (cents): cents is number => typeof cents === "number"
  );

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    genre: row.genre ?? undefined,
    // A rating only renders once there's at least one review behind it —
    // see the schema comment on `ratingAvg` — so an unreviewed book (every
    // book added from the admin starts this way) reads as "no rating yet"
    // rather than "rated zero".
    rating: row.reviewCount > 0 ? row.ratingAvg : undefined,
    reviewCount: row.reviewCount,
    fromPriceCents: prices.length ? Math.min(...prices) : row.priceCents,
    hasPrint,
    hasEbook,
    stockQty: row.stockQty,
    coverImageUrl: row.coverImageUrl,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  };
}
