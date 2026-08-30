import { NextResponse, type NextRequest } from "next/server";
import { fetchBookPage } from "@/lib/books-data";
import { BOOKS_PAGE_SIZE, parseBookQuery } from "@/lib/books-query";

/**
 * Feeds the books listing's infinite scroll. `BooksGrid` calls this with
 * the same filter/sort params plus the opaque `cursor` from the previous
 * response; it gets back the next {@link BOOKS_PAGE_SIZE} titles and a
 * fresh `nextCursor` (`null` at the end). Cost is independent of how deep
 * the reader has scrolled or how large the catalogue is.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = parseBookQuery(params);
  const cursor = params.cursor ?? null;

  const { items, nextCursor } = await fetchBookPage({ query, cursor, limit: BOOKS_PAGE_SIZE });

  return NextResponse.json(
    { items, nextCursor },
    { headers: { "Cache-Control": "no-store" } }
  );
}
