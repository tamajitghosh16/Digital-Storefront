/**
 * The Educational Materials product lines the storefront lists from the
 * database, keyed by their route segment under `/educational-material/`.
 *
 * Every line shares the books listing's machinery — `lib/books-data`,
 * `GET /api/books`, `BooksCatalogue` — and differs only in which
 * `Product.productLine` it reads and the wording around it. Books keep
 * their book-only facets (format, genre, class sets) and their own detail
 * route; the other three are plain shippable items with one shared detail
 * route shape (`[slug]` under each line).
 *
 * `productLine`/`label` mirror `PRODUCT_LINE_CATALOG` in `@repo/database`'s
 * `taxonomy.ts` and the admin's `_shared/product-line-config.ts` — kept in
 * step by hand, like `lib/navigation.ts` (see the root CLAUDE.md). Pure data
 * with a `type`-only import, so Client Components can use it.
 */

import type { ProductLine } from "@repo/database";

export interface ListingLine {
  /** Route segment under `/educational-material/`, also the `?line=` value `GET /api/books` takes. */
  slug: string;
  productLine: ProductLine;
  /** Plural department-menu name — "Educational Charts". */
  label: string;
  /** Listing path — the base every filter/sort href is built on. */
  base: string;
  /** "title"/"titles" in the result count and search copy. */
  noun: { one: string; many: string };
  /** Books only: format, genre and class-set facets, editions, e-books. */
  isBook: boolean;
}

function line(slug: string, productLine: ProductLine, label: string, one: string, many: string, isBook = false): ListingLine {
  return { slug, productLine, label, base: `/educational-material/${slug}`, noun: { one, many }, isBook };
}

export const LISTING_LINES = {
  books: line("books", "BOOK", "Books", "title", "titles", true),
  "educational-charts": line("educational-charts", "EDUCATIONAL_CHART", "Educational Charts", "chart", "charts"),
  "worksheets-activity-puzzles": line(
    "worksheets-activity-puzzles",
    "WORKSHEET_ACTIVITY_PUZZLE",
    "Worksheets and Activity Puzzles",
    "item",
    "items"
  ),
  "teaching-learning-materials": line(
    "teaching-learning-materials",
    "TEACHING_LEARNING_MATERIAL",
    "Teaching and Learning Materials",
    "item",
    "items"
  ),
} satisfies Record<string, ListingLine>;

export type ListingLineSlug = keyof typeof LISTING_LINES;

export const BOOKS_LINE: ListingLine = LISTING_LINES.books;

/**
 * Detail-page path for a row of one of the non-book lines, or `undefined`
 * for books, e-books and services — whose path follows from `type` (see
 * `ProductTile`).
 */
export function lineProductHref(productLine: ProductLine | null, slug: string): string | undefined {
  const line = Object.values(LISTING_LINES).find((entry) => entry.productLine === productLine);
  return line && !line.isBook ? `${line.base}/${slug}` : undefined;
}

/** A `?line=` value back to its line, or `undefined` for anything unknown. */
export function findListingLine(slug: string | null | undefined): ListingLine | undefined {
  return slug && Object.hasOwn(LISTING_LINES, slug) ? LISTING_LINES[slug as ListingLineSlug] : undefined;
}
