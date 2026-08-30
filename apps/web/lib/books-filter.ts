/**
 * The books listing's filter + sort rules.
 *
 * Pure functions over already-grouped `BookListing`s — no server imports —
 * so the Server Component page, the `GET /api/books` route that feeds
 * infinite scroll, and any test all narrow and order a result set the same
 * way.
 */

import type { BookListing } from "./books";
import { PRICE_BANDS, type BookQuery } from "./books-query";

export function applyFilters(listings: BookListing[], query: BookQuery): BookListing[] {
  const term = query.q?.toLowerCase();
  const band = query.price ? PRICE_BANDS.find((entry) => entry.value === query.price) : undefined;

  return listings.filter((book) => {
    if (query.genres.length && (!book.genre || !query.genres.includes(book.genre))) return false;
    if (term && !`${book.title} ${book.author} ${book.genre ?? ""}`.toLowerCase().includes(term)) return false;
    if (query.format === "print" && !book.hasPrint) return false;
    if (query.format === "ebook" && !book.hasEbook) return false;
    if (query.avail === "in-stock" && !(book.hasEbook || (book.stockQty ?? 0) > 0)) return false;
    if (query.avail === "same-day" && (book.stockQty ?? 0) < 30) return false;
    if (query.rating && (book.rating ?? 0) < Number(query.rating)) return false;
    if (band && !band.test(book.fromPriceCents)) return false;
    if (query.classSet && !book.hasPrint) return false;
    return true;
  });
}

export function sortListings(listings: BookListing[], sort: string): BookListing[] {
  return [...listings].sort((a, b) => primary(a, b, sort) || a.id.localeCompare(b.id));
}

/** `id` breaks ties in {@link sortListings} so the order is a stable total
 *  order — the same property the cursor pagination relies on. */
function primary(a: BookListing, b: BookListing, sort: string): number {
  switch (sort) {
    case "price":
      return a.fromPriceCents - b.fromPriceCents;
    case "price-desc":
      return b.fromPriceCents - a.fromPriceCents;
    case "reviews":
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    case "title":
      return a.title.localeCompare(b.title);
    case "new":
      return toTime(b.publishedAt ?? b.createdAt) - toTime(a.publishedAt ?? a.createdAt);
    default:
      return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  }
}

/** `createdAt` is a `Date` from Prisma but an ISO string once a listing has
 *  made a round trip through the `/api/books` JSON response. */
function toTime(value: Date | string): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}
