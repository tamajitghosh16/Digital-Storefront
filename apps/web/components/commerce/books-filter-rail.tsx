"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@repo/ui/utils";
import {
  AVAILABILITY_OPTIONS,
  FORMAT_OPTIONS,
  PRICE_BANDS,
  RATING_OPTIONS,
  booksHref,
} from "@/lib/books-query";

/**
 * The facet rail. Every control drives the query string — a persistent
 * sidebar on desktop, the body of a slide-over sheet on mobile (the
 * toolbar owns the sheet and passes `onNavigate` to close it after a tap).
 * Availability, format, rating and price are single-select: tapping the
 * active option clears it. Genre is multi-select.
 */
export function BooksFilters({
  availableGenres,
  className,
  onNavigate,
}: {
  availableGenres: readonly string[];
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());
  const selectedGenres = new Set((current.genre ?? "").split(",").filter(Boolean));
  const isDirty = Array.from(searchParams.keys()).some(
    (key) => key !== "sort" && key !== "view"
  );

  function go(next: Record<string, string | undefined>) {
    router.push(booksHref({ ...current, page: undefined, ...next }));
    onNavigate?.();
  }

  function single(key: string, value: string) {
    go({ [key]: current[key] === value ? undefined : value });
  }

  function toggleGenre(genre: string) {
    const next = new Set(selectedGenres);
    if (next.has(genre)) next.delete(genre);
    else next.add(genre);
    go({ genre: Array.from(next).join(",") || undefined });
  }

  return (
    <aside className={cn("text-sm", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base">Filters</h2>
        {isDirty && (
          <button
            type="button"
            onClick={() => {
              router.push(booksHref({ sort: current.sort, view: current.view }));
              onNavigate?.();
            }}
            className="text-[13px] font-bold underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      <Group title="Availability">
        {AVAILABILITY_OPTIONS.map((option) => (
          <Check
            key={option.value}
            active={current.avail === option.value}
            onClick={() => single("avail", option.value)}
          >
            {option.label}
          </Check>
        ))}
      </Group>

      <Group title="Format">
        {FORMAT_OPTIONS.map((option) => (
          <Check
            key={option.value}
            active={current.format === option.value}
            onClick={() => single("format", option.value)}
          >
            {option.label}
          </Check>
        ))}
      </Group>

      {availableGenres.length > 0 && (
        <Group title="Genre">
          {availableGenres.map((genre) => (
            <Check key={genre} active={selectedGenres.has(genre)} onClick={() => toggleGenre(genre)}>
              {genre}
            </Check>
          ))}
        </Group>
      )}

      <Group title="Price">
        {PRICE_BANDS.map((band) => (
          <Check
            key={band.value}
            active={current.price === band.value}
            onClick={() => single("price", band.value)}
          >
            {band.label}
          </Check>
        ))}
      </Group>

      <Group title="Rating">
        {RATING_OPTIONS.map((option) => (
          <Check
            key={option.value}
            active={current.rating === option.value}
            onClick={() => single("rating", option.value)}
          >
            {option.label}
          </Check>
        ))}
      </Group>

      <Group title="Class sets">
        <Check
          active={current.classset === "1"}
          onClick={() => go({ classset: current.classset === "1" ? undefined : "1" })}
        >
          Available as a class set
        </Check>
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-4">
      <p className="caps mb-2 text-ink-muted">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function Check({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-btn px-2 py-1.5 text-left transition-colors hover:bg-tile"
    >
      <span
        aria-hidden
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border-2 text-[10px] leading-none",
          active ? "border-ink bg-ink text-ground" : "border-line-strong"
        )}
      >
        {active && "✓"}
      </span>
      <span className={cn("text-[13px]", active && "font-bold")}>{children}</span>
    </button>
  );
}
