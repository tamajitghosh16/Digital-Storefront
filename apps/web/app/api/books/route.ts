import { NextResponse, type NextRequest } from "next/server";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import { fetchBookPage } from "@/lib/books-data";
import { BOOKS_PAGE_SIZE, parseBookQuery } from "@/lib/books-query";
import { BOOKS_LINE, findListingLine } from "@/lib/product-lines";

/**
 * Feeds the books listing's infinite scroll. `BooksGrid` calls this with
 * the same filter/sort params plus the opaque `cursor` from the previous
 * response; it gets back the next {@link BOOKS_PAGE_SIZE} titles and a
 * fresh `nextCursor` (`null` at the end). Cost is independent of how deep
 * the reader has scrolled or how large the catalogue is. `?line=` names
 * which Educational Materials line to page through (`lib/product-lines`);
 * absent means Books, anything unrecognised is a 400.
 *
 * Public and unauthenticated, so it's rate-limited per IP and every param
 * is length-capped before it reaches the query builder.
 */
const MAX_PARAM_LENGTH = 200;

export async function GET(request: NextRequest) {
  if (!(await rateLimit(RATE_LIMITS.catalogueApi, clientIp(request.headers))).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const entries = [...request.nextUrl.searchParams.entries()];
  if (entries.length > 30 || entries.some(([key, value]) => key.length > 40 || value.length > MAX_PARAM_LENGTH)) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const params = Object.fromEntries(entries);
  const line = params.line ? findListingLine(params.line) : BOOKS_LINE;
  if (!line) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const query = parseBookQuery(params);
  const cursor = params.cursor ?? null;

  const { items, nextCursor } = await fetchBookPage({
    query,
    cursor,
    limit: BOOKS_PAGE_SIZE,
    productLine: line.productLine,
  });

  return NextResponse.json(
    { items, nextCursor },
    { headers: { "Cache-Control": "no-store" } }
  );
}
