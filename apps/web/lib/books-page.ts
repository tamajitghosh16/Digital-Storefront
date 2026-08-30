/**
 * Keyset (cursor) pagination for the books listing.
 *
 * Infinite scroll only ever moves forward, so the listing never needs
 * page numbers or `OFFSET`. Each response carries an opaque `nextCursor`
 * that pins the exact spot the reader has reached — the sort value of the
 * last row plus its id as a tie-break. The next request resumes strictly
 * after that spot, so the work to serve page 50,000 is the same as page 1
 * (an index seek + 20 rows), not "skip a million rows first".
 *
 * The client treats the cursor as a black box: it hands back whatever it
 * was given. Only the server (in-memory here, a `WHERE (sort, id) > (…)`
 * clause once this reads from Postgres) encodes or decodes it.
 */

import type { BookListing } from "./books";

export interface CursorPayload {
  /** The last row's value in the active sort column. */
  s: string | number;
  /** The last row's id — the stable tie-break. */
  id: string;
}

export interface BookPage {
  items: BookListing[];
  /** `null` once the last row has been served. */
  nextCursor: string | null;
}

interface SortKey {
  dir: "asc" | "desc";
  value: (book: BookListing) => string | number;
}

/** Which column each sort orders by, and how to read it off a listing. */
export const SORT_KEYS = {
  rating: { dir: "desc", value: (b) => b.rating ?? 0 },
  reviews: { dir: "desc", value: (b) => b.reviewCount ?? 0 },
  price: { dir: "asc", value: (b) => b.fromPriceCents },
  "price-desc": { dir: "desc", value: (b) => b.fromPriceCents },
  title: { dir: "asc", value: (b) => b.title },
  new: { dir: "desc", value: (b) => toTime(b.publishedAt ?? b.createdAt) },
} satisfies Record<string, SortKey>;

export function sortKey(sort: string): SortKey {
  return (SORT_KEYS as Record<string, SortKey>)[sort] ?? SORT_KEYS.rating;
}

export function encodeCursor(book: BookListing, sort: string): string {
  const payload: CursorPayload = { s: sortKey(sort).value(book), id: book.id };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): CursorPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (parsed && typeof parsed.id === "string" && (typeof parsed.s === "string" || typeof parsed.s === "number")) {
      return parsed as CursorPayload;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Slice one page out of an already-sorted list. This is the in-memory
 * stand-in for the database's keyset seek — fine for the bundled sample
 * catalogue, and the exact contract `fetchBookPage`'s Postgres branch
 * fills once real inventory exists.
 */
export function paginateSorted(
  sorted: BookListing[],
  cursorRaw: string | null,
  limit: number,
  sort: string
): BookPage {
  let start = 0;
  const cursor = decodeCursor(cursorRaw);
  if (cursor) {
    const at = sorted.findIndex((book) => book.id === cursor.id);
    if (at >= 0) start = at + 1;
  }

  const items = sorted.slice(start, start + limit);
  const last = items[items.length - 1];
  const more = items.length === limit && start + limit < sorted.length;
  return { items, nextCursor: more && last ? encodeCursor(last, sort) : null };
}

function toTime(value: Date | string): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}
