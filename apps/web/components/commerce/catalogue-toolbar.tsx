"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@repo/ui/utils";

/**
 * Genre chips and a sort control for a listing page.
 *
 * Both drive the query string rather than local state, so a filtered
 * result set is linkable and the masthead search (`?q=`) composes with
 * them. The chips are plain links; the sort is a `<select>` that
 * navigates on change, which is the control the design calls for.
 */

export interface CatalogueQuery {
  q?: string;
  genre?: string;
  sort?: string;
}

export const SORT_OPTIONS = [
  { value: "rating", label: "Best rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "price", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "title", label: "Title A–Z" },
  { value: "new", label: "Newest" },
] as const;

export function buildCatalogueHref(basePath: string, query: CatalogueQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.genre) params.set("genre", query.genre);
  if (query.sort) params.set("sort", query.sort);
  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function CatalogueToolbar({
  basePath,
  genres,
  query,
  resultCount,
}: {
  basePath: string;
  genres: string[];
  query: CatalogueQuery;
  resultCount: number;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3.5 pb-[22px]">
      <div className="flex flex-wrap gap-2">
        <Chip href={buildCatalogueHref(basePath, { q: query.q, sort: query.sort })} active={!query.genre}>
          All genres
        </Chip>
        {genres.map((genre) => (
          <Chip
            key={genre}
            href={buildCatalogueHref(basePath, { ...query, genre })}
            active={query.genre === genre}
          >
            {genre}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-2.5 text-sm text-ink-muted">
        <span className="tabular-nums">
          {resultCount} {resultCount === 1 ? "title" : "titles"}
        </span>
        <label htmlFor="catalogue-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="catalogue-sort"
          value={query.sort ?? "rating"}
          onChange={(event) =>
            router.push(buildCatalogueHref(basePath, { ...query, sort: event.target.value }))
          }
          className="h-[42px] rounded-full border-2 border-ink bg-ground px-4 text-sm font-bold text-ink focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full px-4 py-2.5 text-sm font-bold transition-colors",
        active ? "bg-ink text-ground" : "bg-tile text-ink hover:bg-tile-2"
      )}
    >
      {children}
    </Link>
  );
}
