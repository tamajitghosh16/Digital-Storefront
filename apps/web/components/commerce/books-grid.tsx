"use client";
import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { BookListing } from "@/lib/books";
import { canonicalBookQuery, queryToParams, type BookQuery } from "@/lib/books-query";
import type { ListingLine } from "@/lib/product-lines";
import { BookCard } from "./book-card";

/**
 * The results, revealed one keyset page at a time.
 *
 * The server hands us the first page already rendered plus a `nextCursor`;
 * an IntersectionObserver on the sentinel below the list asks `/api/books`
 * for the page *after* that cursor shortly before it scrolls into view and
 * appends it. `nextCursor === null` means the end. The parent remounts this
 * component (keyed on the query string) whenever a filter, the sort or the
 * view changes, so we restart from a fresh, matching first page. Nothing
 * here grows with catalogue size.
 *
 * The pages live in the browser's query cache (`QueryProvider`), keyed by
 * line and the normalised query, so leaving the listing — to open a book —
 * and coming back shows everything already scrolled through at once instead
 * of starting over. They count as fresh for a minute; after that, coming
 * back re-checks them in the background while the old ones stay on screen.
 */

/** Covers fetched eagerly — one full grid row at the widest (5-column) layout. */
const FIRST_ROW = 5;

interface BooksGridProps {
  initialItems: BookListing[];
  initialCursor: string | null;
  query: BookQuery;
  line: ListingLine;
}

type ListingPage = { items: BookListing[]; nextCursor: string | null };

export function BooksGrid({ initialItems, initialCursor, query, line }: BooksGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const list = query.view === "list";

  const search = useMemo(() => {
    const params = new URLSearchParams(
      Object.entries(queryToParams(query)).filter((entry): entry is [string, string] => entry[1] != null)
    );
    if (!line.isBook) params.set("line", line.slug);
    return params;
  }, [query, line]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ["listing", line.slug, canonicalBookQuery(query)],
    queryFn: async ({ pageParam, signal }): Promise<ListingPage> => {
      const params = new URLSearchParams(search);
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`/api/books?${params.toString()}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ListingPage;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // The server-rendered first page; ignored when the cache already holds
    // this listing (a return visit), which is the point.
    initialData: { pages: [{ items: initialItems, nextCursor: initialCursor }], pageParams: [null] },
  });

  // Keyset pages can overlap at their edges if the catalogue changed between
  // two fetches; show each title once.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? []).flatMap((page) =>
      page.items.filter((book) => (seen.has(book.id) ? false : (seen.add(book.id), true)))
    );
  }, [data]);

  const atEnd = !hasNextPage;
  const canLoad = !atEnd && !isFetchingNextPage && !isFetchNextPageError;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoad, fetchNextPage]);

  return (
    <>
      <ul
        className={
          list
            ? "flex flex-col divide-y divide-line"
            : "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        }
      >
        {items.map((book, index) => (
          <li key={book.id} className={list ? "py-4 first:pt-0 last:pb-0" : undefined}>
            <BookCard listing={book} view={query.view} base={line.base} priority={index < FIRST_ROW} />
          </li>
        ))}
      </ul>

      {!atEnd && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          {isFetchNextPageError ? (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              className="rounded-btn bg-tile px-4 py-2 text-sm font-bold hover:bg-tile-2"
            >
              Couldn&rsquo;t load more — try again
            </button>
          ) : (
            <span className="text-sm text-ink-muted" aria-live="polite">
              Loading more {line.noun.many}&hellip;
            </span>
          )}
        </div>
      )}
    </>
  );
}
