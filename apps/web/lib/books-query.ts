/**
 * The books listing's URL contract.
 *
 * Every filter, the sort and the view live in the query string rather than
 * component state, so a narrowed result set is linkable and the masthead
 * search (`?q=`) composes with the facet rail. There is deliberately no
 * `page` param: the listing is infinite-scroll only and pages forward with
 * an opaque cursor (see `lib/books-page`), never a page number. This
 * module is pure data + string helpers — no server imports — so the
 * Client Component rail and toolbar and the Server Component that renders
 * results all build the same hrefs from it.
 */

export const BOOKS_BASE = "/educational-material/books";
/** Titles per keyset page — the first is server-rendered, the rest come in
 *  as the reader scrolls (see `BooksGrid` / `GET /api/books`). */
export const BOOKS_PAGE_SIZE = 20;

export const SORT_OPTIONS = [
  { value: "rating", label: "Best rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "price", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "title", label: "Title A–Z" },
  { value: "new", label: "Newest" },
] as const;

/** Single-copy price bands, in paise, matched against a title's "from" price. */
export const PRICE_BANDS = [
  { value: "lt1500", label: "Under ₹1,500", test: (cents: number) => cents < 150000 },
  { value: "1500-2500", label: "₹1,500 – ₹2,500", test: (cents: number) => cents >= 150000 && cents <= 250000 },
  { value: "gt2500", label: "Over ₹2,500", test: (cents: number) => cents > 250000 },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In stock" },
  { value: "same-day", label: "Same-day Kolkata" },
] as const;

export const FORMAT_OPTIONS = [
  { value: "print", label: "Available in print" },
  { value: "ebook", label: "Available as e-book" },
] as const;

export const RATING_OPTIONS = [
  { value: "4", label: "4 stars & up" },
  { value: "3", label: "3 stars & up" },
] as const;

export type BookView = "grid" | "list";

export interface BookQuery {
  q?: string;
  genres: string[];
  format?: string;
  avail?: string;
  rating?: string;
  price?: string;
  classSet: boolean;
  sort: string;
  view: BookView;
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Awaited `searchParams` (or a plain object) -> a fully-defaulted query. */
export function parseBookQuery(params: RawParams): BookQuery {
  const genres = (first(params.genre) ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    q: first(params.q)?.trim() || undefined,
    genres,
    format: first(params.format) || undefined,
    avail: first(params.avail) || undefined,
    rating: first(params.rating) || undefined,
    price: first(params.price) || undefined,
    classSet: first(params.classset) === "1",
    sort: first(params.sort) || "rating",
    view: first(params.view) === "list" ? "list" : "grid",
  };
}

/** A parsed query back to the flat param map the href builder consumes. */
export function queryToParams(query: BookQuery): Record<string, string | undefined> {
  return {
    q: query.q,
    genre: query.genres.join(",") || undefined,
    format: query.format,
    avail: query.avail,
    rating: query.rating,
    price: query.price,
    classset: query.classSet ? "1" : undefined,
    sort: query.sort,
    view: query.view,
  };
}

/**
 * Build a listing href from a flat param map. Empty values are dropped, and
 * so are the defaults (`sort=rating`, `view=grid`) so a pristine link
 * stays `/educational-material/books`.
 */
export function booksHref(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  if (search.get("sort") === "rating") search.delete("sort");
  if (search.get("view") === "grid") search.delete("view");
  const suffix = search.toString();
  return suffix ? `${BOOKS_BASE}?${suffix}` : BOOKS_BASE;
}
