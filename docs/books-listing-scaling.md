# Books listing — scaling to a large catalogue

The books listing (`/educational-material/books`) is built so that response
time does **not** grow with the size of the catalogue. This note records how,
and what is still needed for the database-backed path to hold at ~1M rows.

## What makes it flat

| Concern | How it's handled |
| --- | --- |
| Loading rows | Every request returns **at most `BOOKS_PAGE_SIZE` (20)** titles. Nothing loads the whole table. |
| Paging deeper | **Keyset (cursor) pagination**, not `OFFSET`. Each response carries an opaque `nextCursor` = `(sortValue, id)` of the last row; the next request resumes strictly after it. Page 50,000 costs an index seek + 20 rows, same as page 1. |
| Sorting | Done by the database on an indexed column (`ORDER BY <col>, id`), never in application memory. |
| Total count | `countBookListings()` is one aggregate, run **only on the initial render**, never per scroll. |
| Client | `BooksGrid` holds only the rows it has shown and the current cursor. An `IntersectionObserver` requests the next page ~600 px before the sentinel is visible. |

Key modules:

- `lib/books-page.ts` — cursor encode/decode, the `SORT_KEYS` map, and
  `paginateSorted()` (the in-memory stand-in for the DB keyset seek).
- `lib/books-data.ts` — `fetchBookPage()` / `countBookListings()`, querying
  `Product` with a sample-catalogue fallback (`withFallback()`) for when
  the database is unreachable.
- `app/api/books/route.ts` — `GET /api/books?…&cursor=…` → `{ items, nextCursor }`.

## Live (current)

The Postgres branch is what's live. `fetchBookPage()` / `countBookListings()`
(`lib/books-data.ts`) query `Product` directly and fall back to the bundled
~100-title sample catalogue (`lib/sample-data/books.ts`, itself expanded
from the same seed data as `prisma/seed.ts` — see `@repo/database`'s
`src/book-catalog.ts`) only via `withFallback()`, when the database is
unreachable or the query throws. That means a title added, edited, or
hidden from the admin's Books CMS shows up on the storefront on the very
next request — no redeploy, no cache to invalidate.

What made the Postgres branch real, from the state described below:

1. **One `Product` row per title.** The branch assumes the single-row model
   the admin already writes (`bookFormats: [PHYSICAL, EBOOK]`,
   `priceCents` + `ebookPriceCents` on one row) so that `LIMIT` counts
   titles, not editions. `prisma/seed.ts` writes the 100-title demo
   catalogue the same way, rather than as the `-ebook`-slug two-row model
   `groupBookEditions()` collapses — that model cannot be `LIMIT`ed and
   must not be used here.

2. **`Product.genre`, `Product.ratingAvg`, `Product.reviewCount`.** Added
   (with `@@index`es) so `sort=rating` / `sort=reviews` and the genre /
   "N stars & up" filters work server-side — see `SORT_COLUMN` and
   `buildBookWhere()` in `lib/books-data.ts`. Both rating columns default
   to `0` rather than null, specifically so keyset pagination on those
   columns never has to reason about nulls; `rowToListing()` only surfaces
   a rating once `reviewCount > 0`, so a freshly added, unreviewed book
   reads as "no rating yet" rather than "rated zero". Nothing aggregates
   real `Review` rows into `ratingAvg`/`reviewCount` yet — that's the next
   piece of this, once reviews go through a moderation flow that fires a
   `packages/jobs` event on approval.

## Still open, for genuine O(1M) scale

3. **Indexes on every sort column**, each compounded with `id` for the
   tie-break:
   - `(priceCents, id)`
   - `(title, id)`
   - `(publishedAt, id)`
   - `(createdAt, id)`
   plus a partial predicate or leading column for the always-on filter
   `isPublished = true AND type IN ('PHYSICAL_BOOK','EBOOK')`.

4. **Text search.** `buildBookWhere()` uses `contains … mode: insensitive`
   (`ILIKE %term%`), which cannot use a b-tree index. For a large catalogue
   switch `q` to Postgres full-text (`to_tsvector`/`websearch_to_tsquery`
   with a GIN index) or a trigram index (`pg_trgm`).

5. **Count cost.** A filtered `COUNT(*)` over ~1M rows is still a scan of the
   matching index range. Acceptable at one call per navigation; if it shows
   up in traces, switch the label to an estimate (`reltuples` /
   `EXPLAIN`-derived) or drop the exact number.

6. **`availableGenres`.** Still just the full `BOOK_GENRES` list rather than
   "genres that have at least one book" — the latter is now a cheap
   `SELECT DISTINCT genre` given item 2 landed, just not wired up.
