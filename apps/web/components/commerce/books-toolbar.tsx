"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { cn } from "@repo/ui/utils";
import { SORT_OPTIONS, booksHref } from "@/lib/books-query";
import { BooksFilters } from "./books-filter-rail";

/**
 * The one control row that sits beside the "All Books" heading: keyword
 * search, a "Filter" button that opens the facet rail in a sheet, and the
 * sort / view selects. Every control writes the query string so a narrowed
 * result set stays a shareable URL.
 */

const CONTROL =
  "h-[42px] rounded-full border-2 border-ink bg-ground px-4 text-sm font-bold text-ink focus:outline-none";

export function BooksToolbar({ availableGenres }: { availableGenres: readonly string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFacetCount = Array.from(searchParams.keys()).filter(
    (key) => key !== "sort" && key !== "view" && key !== "q" && key !== "page"
  ).length;

  function go(next: Record<string, string | undefined>) {
    router.push(booksHref({ ...current, page: undefined, ...next }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          go({ q: (typeof value === "string" && value.trim()) || undefined });
        }}
        className="relative"
      >
        {/* Uncontrolled + keyed on the URL's `q`, so clearing the search
            chip elsewhere resets the field without a state-sync effect. */}
        <input
          key={current.q ?? ""}
          type="search"
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="Search books"
          aria-label="Search books"
          className="h-[42px] w-full min-w-[180px] rounded-full border-2 border-line-strong bg-ground pl-4 pr-10 text-sm focus:border-ink focus:outline-none sm:w-[210px]"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-tile"
        >
          <SearchGlyph />
        </button>
      </form>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetTrigger asChild>
          <button type="button" className={cn(CONTROL, "inline-flex items-center gap-2")}>
            <FilterGlyph />
            Filter
            {activeFacetCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-ground tabular-nums">
                {activeFacetCount}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto bg-page text-ink">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold tracking-[-0.01em]">Filter books</SheetTitle>
          </SheetHeader>
          <BooksFilters availableGenres={availableGenres} onNavigate={() => setFiltersOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative">
        <label htmlFor="books-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="books-sort"
          value={current.sort ?? "rating"}
          onChange={(event) => go({ sort: event.target.value })}
          className={cn(CONTROL, "appearance-none pr-9")}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort by: {option.label}
            </option>
          ))}
        </select>
        <CaretGlyph />
      </div>

      <div className="relative">
        <label htmlFor="books-view" className="sr-only">
          View as
        </label>
        <select
          id="books-view"
          value={current.view ?? "grid"}
          onChange={(event) => go({ view: event.target.value })}
          className={cn(CONTROL, "appearance-none pr-9")}
        >
          <option value="grid">View as: Grid</option>
          <option value="list">View as: List</option>
        </select>
        <CaretGlyph />
      </div>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l4 4" strokeLinecap="round" />
    </svg>
  );
}

function FilterGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor">
      <path d="M0.5 1.5h13l-5 6v5l-3 1.5v-6.5z" />
    </svg>
  );
}

function CaretGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
    >
      <path d="M2 4l3.5 3.5L9 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
