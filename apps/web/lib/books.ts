/**
 * A book's editions, summarised into one catalogue listing.
 *
 * A book is one `Product` row with a `BookEdition` per format it's sold in
 * — Paperback, Hardcover, E-book: any one, two or all three. The catalogue
 * shows one card per *title*: it never names the format, leads with the
 * cheapest edition's price, and links to the detail page where the reader
 * picks one.
 */

import type { BookEdition, Product } from "@repo/database";

/**
 * A Product row plus the display-only fields the sample data carries.
 * `genre` and `reviewCount` are real `Product` columns now — only `rating`
 * and the jacket gradient stops are sample-only; a real row carries the
 * same number under `ratingAvg` instead — see {@link productRating}.
 */
type BookRow = Product & Partial<{ rating: number; coverFrom: string; coverTo: string }>;

type EditionSummary = Pick<BookEdition, "format" | "priceCents" | "stockQty">;

/**
 * A catalogue row with the editions it's sold in. A book has one to three;
 * the other Educational Materials lines (charts, worksheets, …) share this
 * listing and have none — they're one shipped product, priced and stocked
 * on the row itself.
 */
export type BookWithEditions = BookRow & { editions: EditionSummary[] };

/**
 * A title's rating, whichever key the row carries it under — `rating` on
 * the bundled sample data, `ratingAvg` on a real database row. A database
 * row only "has" a rating once it's actually been reviewed (`reviewCount >
 * 0`); before that `ratingAvg` is a meaningless 0 (see the schema comment
 * on `Product.ratingAvg`), so it renders as no rating at all rather than
 * a rated-zero book.
 */
export function productRating(row: BookRow | null | undefined): number | undefined {
  if (!row) return undefined;
  if (typeof row.rating === "number") return row.rating;
  return row.reviewCount > 0 ? row.ratingAvg : undefined;
}

export interface BookListing {
  id: string;
  slug: string;
  title: string;
  author: string;
  genre?: string;
  rating?: number;
  reviewCount?: number;
  /** The cheapest edition's price — what the card shows. */
  fromPriceCents: number;
  /** True when the editions aren't all one price, so the card says "from". */
  priceVaries: boolean;
  /** Every format the title is sold in, in Paperback → Hardcover → E-book order. */
  formats: BookEdition["format"][];
  /** Sold as a paperback and/or hardcover. */
  hasPrint: boolean;
  hasEbook: boolean;
  /**
   * Printed copies on hand across the paperback + hardcover editions.
   * `null` when there's a printed edition whose stock isn't tracked (always
   * orderable) or no printed edition at all.
   */
  stockQty: number | null;
  coverImageUrl?: string | null;
  coverFrom?: string;
  coverTo?: string;
  publishedAt: Date | null;
  createdAt: Date;
}

const FORMAT_ORDER: BookEdition["format"][] = ["PAPERBACK", "HARDCOVER", "EBOOK"];

export function bookToListing(row: BookWithEditions): BookListing {
  // No editions: a non-book line's single shipped product, read as one
  // untiered "print" edition from the row's own price and stock.
  const editions: EditionSummary[] = row.editions.length
    ? row.editions
    : row.type === "PHYSICAL_BOOK"
      ? [{ format: "PAPERBACK", priceCents: row.priceCents, stockQty: row.stockQty }]
      : [];
  const print = editions.filter((edition) => edition.format !== "EBOOK");
  const prices = editions.map((edition) => edition.priceCents);
  const untracked = print.some((edition) => edition.stockQty === null);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    genre: row.genre ?? undefined,
    rating: productRating(row),
    reviewCount: row.reviewCount,
    fromPriceCents: prices.length ? Math.min(...prices) : row.priceCents,
    priceVaries: new Set(prices).size > 1,
    formats: FORMAT_ORDER.filter((format) => row.editions.some((edition) => edition.format === format)),
    hasPrint: print.length > 0,
    hasEbook: editions.some((edition) => edition.format === "EBOOK"),
    stockQty: print.length && !untracked ? print.reduce((sum, edition) => sum + (edition.stockQty ?? 0), 0) : null,
    coverImageUrl: row.coverImageUrl,
    coverFrom: row.coverFrom,
    coverTo: row.coverTo,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
  };
}
