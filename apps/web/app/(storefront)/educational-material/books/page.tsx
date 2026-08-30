import type { Metadata } from "next";
import { countBookListings, fetchBookPage } from "@/lib/books-data";
import { BOOK_GENRES } from "@/lib/navigation";
import { BOOKS_PAGE_SIZE, parseBookQuery } from "@/lib/books-query";
import { BooksCatalogue } from "@/components/commerce/books-catalogue";

export const metadata: Metadata = { title: "Books" };

// FR-2.1: the whole book catalogue — printed and digital editions of every
// title on one page, with genre/format/price/rating filtering and sorting.
// Only the first `BOOKS_PAGE_SIZE` titles are sent with the document; the
// rest stream in from `/api/books` as the reader scrolls, one keyset page
// at a time (see `BooksGrid` and `lib/books-data`), so nothing here scales
// with catalogue size. `type` still stands in for the going-forward
// `productLine: "BOOK"` filter while only Books writes that column (see
// root CLAUDE.md).
export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseBookQuery(await searchParams);

  const [{ items, nextCursor }, total] = await Promise.all([
    fetchBookPage({ query, cursor: null, limit: BOOKS_PAGE_SIZE }),
    countBookListings(query),
  ]);

  return (
    <BooksCatalogue
      initialItems={items}
      initialCursor={nextCursor}
      total={total}
      availableGenres={[...BOOK_GENRES]}
      query={query}
    />
  );
}
