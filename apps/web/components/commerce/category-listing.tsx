import Link from "next/link";
import { Breadcrumb, Wrap, buttonClass } from "@/components/primitives";
import { ReturnsBand } from "@/components/marketing";

/**
 * An Educational Materials product line that has no inventory yet.
 *
 * Same shell as the books listing (`BooksCatalogue`) — breadcrumb, "All X"
 * heading, the search / filter / sort / view control row — but there is
 * nothing to browse, so the controls are decorative and the results area
 * is a single empty state. Swap this for a real data-backed listing (the
 * books page is the template) once the line has products.
 */

const CONTROL =
  "inline-flex h-[42px] items-center gap-2 rounded-full border-2 border-line-strong bg-ground px-4 text-sm font-bold text-ink-muted";

export function CategoryListing({ title }: { title: string }) {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[{ label: "Home", href: "/" }, { label: "Educational Materials" }, { label: title }]}
        />
      </Wrap>

      <Wrap as="section" className="pb-14 pt-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1>All {title}</h1>

          {/* Mirrors the books listing's control row; inert until this line
              has stock to search, filter and sort. */}
          <div className="flex flex-wrap items-center gap-2.5" aria-hidden>
            <div className="relative">
              <span className="flex h-[42px] w-full min-w-[180px] items-center rounded-full border-2 border-line-strong bg-ground pl-4 pr-10 text-sm text-ink-subtle sm:w-[210px]">
                Search
              </span>
              <span className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full text-ink-subtle">
                <SearchGlyph />
              </span>
            </div>
            <span className={CONTROL}>
              <FilterGlyph />
              Filter
            </span>
            <span className={`${CONTROL} pr-9`}>Sort by</span>
            <span className={`${CONTROL} pr-9`}>View as</span>
          </div>
        </div>

        <p className="mt-6 text-sm tabular-nums text-ink-muted">0 titles</p>

        <div className="mt-3">
          <div className="rounded-tile bg-tile px-6 py-16 text-center inset-ring inset-ring-card-edge">
            <h3>Nothing here yet.</h3>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
              {`${title} aren’t in the catalogue yet.`} Browse the full book list in the
              meantime.
            </p>
            <Link
              href="/educational-material/books"
              className={buttonClass("secondary", "md", "mt-5")}
            >
              Browse books
            </Link>
          </div>
        </div>

        <ReturnsBand />
      </Wrap>
    </>
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
