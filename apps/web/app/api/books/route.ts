import { createHash } from "node:crypto";
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
 *
 * Cacheable by browsers and shared caches ({@link PUBLIC_CACHE}): the
 * response depends only on the URL — no cookies are read, and the proxy
 * (and with it any session refresh) never runs on /api — and its data is
 * the same catalogue the listing pages cache server-side. The figures keep
 * the 5-minute worst case of docs/adr/0001-caching-strategy.md: a minute
 * fresh in a shared cache plus four served stale while it refetches. A
 * weak ETag lets a browser revalidate a page it already holds for a 304.
 */
const MAX_PARAM_LENGTH = 200;

const PUBLIC_CACHE = "public, max-age=30, s-maxage=60, stale-while-revalidate=240";

export async function GET(request: NextRequest) {
  if (!(await rateLimit(RATE_LIMITS.catalogueApi, clientIp(request.headers))).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const entries = [...request.nextUrl.searchParams.entries()];
  if (entries.length > 30 || entries.some(([key, value]) => key.length > 40 || value.length > MAX_PARAM_LENGTH)) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const params = Object.fromEntries(entries);
  const line = params.line ? findListingLine(params.line) : BOOKS_LINE;
  if (!line) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const query = parseBookQuery(params);
  const cursor = params.cursor ?? null;

  const { items, nextCursor } = await fetchBookPage({
    query,
    cursor,
    limit: BOOKS_PAGE_SIZE,
    productLine: line.productLine,
  });

  const body = JSON.stringify({ items, nextCursor });
  const etag = `W/"${createHash("sha256").update(body).digest("base64url").slice(0, 27)}"`;
  const headers = { "Cache-Control": PUBLIC_CACHE, ETag: etag };

  if (matchesETag(request.headers.get("if-none-match"), etag)) {
    return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(body, { headers: { ...headers, "Content-Type": "application/json" } });
}

/** `If-None-Match` may list several tags, or `*`; weak comparison, as RFC 9110 requires for it. */
function matchesETag(header: string | null, etag: string): boolean {
  if (!header) return false;
  const opaque = (tag: string) => tag.trim().replace(/^W\//, "");
  return header.split(",").some((candidate) => candidate.trim() === "*" || opaque(candidate) === opaque(etag));
}
