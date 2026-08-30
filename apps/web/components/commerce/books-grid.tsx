"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookListing } from "@/lib/books";
import { queryToParams, type BookQuery } from "@/lib/books-query";
import { BookCard } from "./book-card";

/**
 * The results, revealed one keyset page at a time.
 *
 * The server hands us the first page already rendered plus a `nextCursor`;
 * an IntersectionObserver on the sentinel below the list asks `/api/books`
 * for the page *after* that cursor shortly before it scrolls into view and
 * appends it, storing the new cursor. `nextCursor === null` means the end.
 * The parent remounts this component (keyed on the query string) whenever
 * a filter, the sort or the view changes, so we restart from a fresh,
 * matching first page. Nothing here grows with catalogue size.
 */

interface BooksGridProps {
  initialItems: BookListing[];
  initialCursor: string | null;
  query: BookQuery;
}

export function BooksGrid({ initialItems, initialCursor, query }: BooksGridProps) {
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const cursorRef = useRef(initialCursor);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [atEnd, setAtEnd] = useState(initialCursor === null);
  const list = query.view === "list";

  const loadMore = useCallback(async () => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    setStatus("loading");
    try {
      const params = new URLSearchParams(
        Object.entries(queryToParams(query)).filter(
          (entry): entry is [string, string] => entry[1] != null
        )
      );
      params.set("cursor", cursor);

      const res = await fetch(`/api/books?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: BookListing[]; nextCursor: string | null };

      cursorRef.current = data.nextCursor;
      setItems((prev) => {
        const seen = new Set(prev.map((book) => book.id));
        return [...prev, ...data.items.filter((book) => !seen.has(book.id))];
      });
      if (data.nextCursor === null) setAtEnd(true);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [query]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || atEnd || status !== "idle") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [atEnd, status, loadMore]);

  return (
    <>
      <ul
        className={
          list
            ? "flex flex-col divide-y divide-line"
            : "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        }
      >
        {items.map((book) => (
          <li key={book.id} className={list ? "py-4 first:pt-0 last:pb-0" : undefined}>
            <BookCard listing={book} view={query.view} />
          </li>
        ))}
      </ul>

      {!atEnd && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          {status === "error" ? (
            <button
              type="button"
              onClick={loadMore}
              className="rounded-btn bg-tile px-4 py-2 text-sm font-bold hover:bg-tile-2"
            >
              Couldn&rsquo;t load more — try again
            </button>
          ) : (
            <span className="text-sm text-ink-muted" aria-live="polite">
              Loading more titles&hellip;
            </span>
          )}
        </div>
      )}
    </>
  );
}
