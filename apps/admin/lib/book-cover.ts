import { BOOK_SEEDS } from "@repo/database";

/**
 * The drawn-jacket gradient for a book that has no uploaded cover.
 *
 * apps/web draws every cover-less book as a 2:3 gradient block (see
 * `BookJacket`), coloured from `coverFrom`/`coverTo` pairs that live in
 * `@repo/database`'s `book-catalog.ts`. `Product` has no column for those,
 * so the admin can't read them back — it recomputes them here instead:
 *
 * - a demo-catalogue slug gets its *exact* storefront colours, so the two
 *   apps show the same jacket for the same title;
 * - anything added from the admin gets a stable colour pair picked from the
 *   same palette by slug, so it looks on-brand and never changes on reload.
 *
 * This module imports a *value* from `@repo/database`, so it must only be
 * used from Server Components — `books/page.tsx` calls it and passes the
 * result down as a prop, the same way the pricing config is threaded.
 */

const SEEDED = new Map(BOOK_SEEDS.map((b) => [b.slug, { from: b.coverFrom, to: b.coverTo }] as const));

/** The distinct colour pairs the demo catalogue uses — the fallback palette. */
const PALETTE = [
  ...new Map(
    BOOK_SEEDS.map((b) => [`${b.coverFrom}|${b.coverTo}`, { from: b.coverFrom, to: b.coverTo }]),
  ).values(),
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function bookCoverGradient(slug: string): { from: string; to: string } {
  const base = slug.replace(/-ebook$/, "");
  return SEEDED.get(base) ?? PALETTE[hash(base) % PALETTE.length]!;
}
