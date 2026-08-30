/**
 * Collapsing a title's editions into one listing.
 *
 * A book is published as up to two `Product` rows that share a base slug —
 * a `PHYSICAL_BOOK` at `the-salt-road` and an `EBOOK` at
 * `the-salt-road-ebook`. The catalogue shows one card per *title*: it
 * never names the format, leads with the lower of the two prices, and
 * links to the detail page where the reader picks an edition. A title sold
 * in only one format is simply a group of one.
 */

import type { Product } from "@repo/database";

/**
 * A Product row plus the display-only fields the sample data carries.
 * `genre` and `reviewCount` are real `Product` columns now — only `rating`
 * and the jacket gradient stops are sample-only; a real row carries the
 * same number under `ratingAvg` instead — see {@link productRating}.
 */
type BookRow = Product & Partial<{ rating: number; coverFrom: string; coverTo: string }>;

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
  /** Where the detail page lives — the printed slug, or the e-book's own slug when that's the only edition. */
  slug: string;
  title: string;
  author: string;
  genre?: string;
  rating?: number;
  reviewCount?: number;
  /** Lower of the printed and e-book price — what the card shows. */
  fromPriceCents: number;
  hasPrint: boolean;
  hasEbook: boolean;
  /** Printed-copy stock, when there is a printed edition. */
  stockQty: number | null;
  coverImageUrl?: string | null;
  coverFrom?: string;
  coverTo?: string;
  publishedAt: Date | null;
  createdAt: Date;
}

export function groupBookEditions(rows: BookRow[]): BookListing[] {
  const groups = new Map<string, { print?: BookRow; ebook?: BookRow }>();

  for (const row of rows) {
    const base = row.slug.replace(/-ebook$/, "");
    const group = groups.get(base) ?? {};
    if (row.type === "EBOOK") group.ebook = row;
    else group.print = row;
    groups.set(base, group);
  }

  const listings: BookListing[] = [];
  for (const { print, ebook } of groups.values()) {
    const lead = print ?? ebook;
    if (!lead) continue;

    const prices = [print?.priceCents, ebook?.priceCents].filter(
      (cents): cents is number => typeof cents === "number"
    );

    listings.push({
      id: lead.id,
      slug: print ? print.slug : lead.slug,
      title: lead.title,
      author: lead.author,
      genre: lead.genre ?? undefined,
      rating: productRating(lead),
      reviewCount: print?.reviewCount ?? ebook?.reviewCount,
      fromPriceCents: prices.length ? Math.min(...prices) : lead.priceCents,
      hasPrint: Boolean(print),
      hasEbook: Boolean(ebook),
      stockQty: print?.stockQty ?? null,
      coverImageUrl: lead.coverImageUrl,
      coverFrom: lead.coverFrom,
      coverTo: lead.coverTo,
      publishedAt: lead.publishedAt ?? null,
      createdAt: lead.createdAt,
    });
  }

  return listings;
}
