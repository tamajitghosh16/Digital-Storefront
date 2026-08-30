import Link from "next/link";
import { Breadcrumb, Wrap, buttonClass } from "@/components/primitives";
import { ReturnsBand } from "@/components/marketing";
import type { BookListing } from "@/lib/books";
import {
  AVAILABILITY_OPTIONS,
  BOOKS_BASE,
  FORMAT_OPTIONS,
  PRICE_BANDS,
  RATING_OPTIONS,
  booksHref,
  queryToParams,
  type BookQuery,
} from "@/lib/books-query";
import { BooksToolbar } from "./books-toolbar";
import { BooksGrid } from "./books-grid";

/**
 * The redesigned books listing — one card per title (print + e-book
 * collapsed), an "All Books" heading with an inline search / filter / sort
 * / view control row, and the results below. The page filters and sorts
 * every matching title server-side but only sends the first screenful;
 * `BooksGrid` streams the rest in as the reader scrolls. Replaces the old
 * split `/books` + `/ebooks` catalogues.
 */

/** The removable pills for what's currently narrowing the list. */
function activeChips(query: BookQuery): { label: string; href: string }[] {
  const params = queryToParams(query);
  const chips: { label: string; href: string }[] = [];

  for (const genre of query.genres) {
    const rest = query.genres.filter((entry) => entry !== genre);
    chips.push({ label: genre, href: booksHref({ ...params, genre: rest.join(",") || undefined, page: undefined }) });
  }
  const single = (key: keyof BookQuery, label: string | undefined) => {
    if (label) chips.push({ label, href: booksHref({ ...params, [key]: undefined, page: undefined }) });
  };
  single("format", FORMAT_OPTIONS.find((entry) => entry.value === query.format)?.label);
  single("avail", AVAILABILITY_OPTIONS.find((entry) => entry.value === query.avail)?.label);
  single("rating", RATING_OPTIONS.find((entry) => entry.value === query.rating)?.label);
  single("price", PRICE_BANDS.find((entry) => entry.value === query.price)?.label);
  if (query.classSet) {
    chips.push({ label: "Class set", href: booksHref({ ...params, classset: undefined, page: undefined }) });
  }
  if (query.q) {
    chips.push({ label: `“${query.q}”`, href: booksHref({ ...params, q: undefined, page: undefined }) });
  }
  return chips;
}

export function BooksCatalogue({
  initialItems,
  initialCursor,
  total,
  availableGenres,
  query,
}: {
  initialItems: BookListing[];
  initialCursor: string | null;
  total: number;
  availableGenres: string[];
  query: BookQuery;
}) {
  const chips = activeChips(query);
  const params = queryToParams(query);

  return (
    <>
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Educational Materials" }, { label: "Books" }]} />
      </Wrap>

      <Wrap as="section" className="pb-14 pt-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1>All Books</h1>
          <BooksToolbar availableGenres={availableGenres} />
        </div>

        <p className="mt-6 text-sm tabular-nums text-ink-muted">
          {total} {total === 1 ? "title" : "titles"}
        </p>

        <div className="mt-3">
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-tile px-3 py-1.5 text-[13px] font-bold hover:bg-tile-2"
                >
                  {chip.label}
                  <span aria-hidden>×</span>
                </Link>
              ))}
              <Link
                href={booksHref({ sort: params.sort, view: params.view })}
                className="text-[13px] font-bold underline underline-offset-2"
              >
                Clear all
              </Link>
            </div>
          )}

          {initialItems.length > 0 ? (
            <BooksGrid
              key={booksHref(params)}
              initialItems={initialItems}
              initialCursor={initialCursor}
              query={query}
            />
          ) : (
            <div className="rounded-tile bg-tile px-6 py-16 text-center inset-ring inset-ring-card-edge">
              <h3>Nothing matched that.</h3>
              <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                Try a different genre, widen the price, or clear the filters to see every title.
              </p>
              <Link href={BOOKS_BASE} className={buttonClass("secondary", "md", "mt-5")}>
                Show all books
              </Link>
            </div>
          )}
        </div>

        <ReturnsBand />
      </Wrap>
    </>
  );
}
