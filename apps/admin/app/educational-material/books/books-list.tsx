"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@repo/database";

/** A Product row plus the drawn-jacket gradient the Server Component adds. */
type BookRow = Product & { coverFrom: string; coverTo: string };
import { LayoutGrid, List, Search } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { EmptyState, Pill, Thumb, controlClass } from "@/components/ui";
import { LinkButton } from "@/components/form-controls";
import { toggleProductPublished } from "./actions";

/**
 * The interactive half of the Books list: search, sort, and table/grid
 * view all live here so they can react instantly without a server round
 * trip. The Server Component above only does the initial fetch and the
 * "books only" filter (SERVICE_PACKAGE never reaches this component).
 */

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

const SORTS = {
  title: { label: "Title (A–Z)", compare: (a: Product, b: Product) => a.title.localeCompare(b.title) },
  "price-asc": { label: "Price (low to high)", compare: (a: Product, b: Product) => a.priceCents - b.priceCents },
  "price-desc": { label: "Price (high to low)", compare: (a: Product, b: Product) => b.priceCents - a.priceCents },
  "stock-asc": {
    label: "Stock (low to high)",
    compare: (a: Product, b: Product) => (a.stockQty ?? -1) - (b.stockQty ?? -1),
  },
  "stock-desc": {
    label: "Stock (high to low)",
    compare: (a: Product, b: Product) => (b.stockQty ?? -1) - (a.stockQty ?? -1),
  },
} as const satisfies Record<string, { label: string; compare: (a: Product, b: Product) => number }>;

type SortKey = keyof typeof SORTS;

/**
 * Curated merchandising status set on a title (seed data / future form) —
 * shown as a stamp in the list. Monochrome like the rest of the admin: a
 * filled stamp for the title we're pushing, a dashed one for a title still
 * on the way, a hairline one for a title that's sold out.
 */
const INVENTORY_STATUS = {
  BEST_SELLING: { label: "Best Selling", tone: "on" },
  COMING_SOON: { label: "Coming Soon", tone: "info" },
  OUT_OF_STOCK: { label: "Out of Stock", tone: "off" },
} as const satisfies Record<string, { label: string; tone: "on" | "off" | "info" }>;

function InventoryStatusCell({ status }: { status: Product["inventoryStatus"] }) {
  if (!status) return <span className="text-ink-subtle">—</span>;
  const { label, tone } = INVENTORY_STATUS[status];
  return <Pill tone={tone}>{label}</Pill>;
}

/**
 * One line per format the book is sold in — physical and e-book are priced
 * (and stocked) separately, so a dual-format book renders as two stacked
 * lines rather than one row averaging the two together. Physical reads in
 * brand blue, e-book in sale red — the one deliberate splash of colour in
 * an otherwise monochrome admin, because the two prices need to read apart
 * at a glance.
 */
interface FormatLine {
  label: string;
  colorClass: string;
  stock: string;
  priceCents: number;
}

function formatLines(product: Product): FormatLine[] {
  const hasPhysical = product.bookFormats.includes("PHYSICAL");
  const hasEbook = product.bookFormats.includes("EBOOK");
  const lines: FormatLine[] = [];
  if (hasPhysical) {
    lines.push({
      label: "Physical book",
      colorClass: "text-brand",
      stock: product.stockQty != null ? String(product.stockQty) : "—",
      priceCents: product.priceCents,
    });
  }
  if (hasEbook) {
    lines.push({
      label: "E-book",
      colorClass: "text-sale",
      stock: "—",
      priceCents: hasPhysical ? (product.ebookPriceCents ?? product.priceCents) : product.priceCents,
    });
  }
  if (lines.length === 0) {
    lines.push({ label: "—", colorClass: "text-ink-muted", stock: "—", priceCents: product.priceCents });
  }
  return lines;
}

export function BooksList({ products }: { products: BookRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("title");
  const [view, setView] = useState<"table" | "grid">("table");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? products.filter((p) => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q))
      : products;
    return [...matched].sort(SORTS[sort].compare);
  }, [products, query, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">All Books</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books from the inventory"
              aria-label="Search books from the inventory"
              className={cn(controlClass, "w-64 pl-9")}
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort by"
            className={cn(controlClass, "w-auto")}
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                Sort by: {label}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-btn border border-line-strong bg-ground p-1">
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              aria-label="View as table"
              className={cn(
                "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
                view === "table" ? "bg-ink text-white" : "text-ink-muted hover:bg-tile"
              )}
            >
              <List aria-hidden className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="View as grid"
              className={cn(
                "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
                view === "grid" ? "bg-ink text-white" : "text-ink-muted hover:bg-tile"
              )}
            >
              <LayoutGrid aria-hidden className="h-3.5 w-3.5" />
              Grid
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No books match your search" : "Nothing in the shop yet"}
          description={
            query
              ? "Try a different title or author."
              : "Add your first printed book or e-book. You can upload the front cover as part of the same form."
          }
        />
      ) : view === "table" ? (
        <BooksTable products={filtered} />
      ) : (
        <BooksGrid products={filtered} />
      )}
    </div>
  );
}

function BooksTable({ products }: { products: BookRow[] }) {
  return (
    <div className="overflow-x-auto rounded-tile border border-line-strong bg-ground">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="border-b border-line-strong text-left">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-medium [&>th]:text-ink-muted">
            <th>Sl. no</th>
            <th>Title</th>
            <th>Author</th>
            <th>Status</th>
            <th>Stock</th>
            <th>Format</th>
            <th>Price per copy</th>
            <th className="text-right">&nbsp;</th>
          </tr>
        </thead>
        <tbody className="[&>tr:not(:last-child)]:border-b [&>tr:not(:last-child)]:border-line [&>tr>td]:px-4 [&>tr>td]:py-3 [&>tr]:align-middle">
          {products.map((product, index) => {
            const lines = formatLines(product);
            return (
              <tr key={product.id}>
                <td className="tabular-nums text-ink-muted">{index + 1}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Thumb
                      src={product.coverImageUrl}
                      alt=""
                      title={product.title}
                      from={product.coverFrom}
                      to={product.coverTo}
                    />
                    <Link
                      href={`/educational-material/books/${product.id}`}
                      className="font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {product.title}
                    </Link>
                  </div>
                </td>
                <td className="text-ink-muted">{product.author}</td>
                <td>
                  <InventoryStatusCell status={product.inventoryStatus} />
                </td>
                <td className="tabular-nums text-ink-muted">
                  <div className="flex flex-col gap-1">
                    {lines.map((line, i) => (
                      <span key={i}>{line.stock}</span>
                    ))}
                  </div>
                </td>
                <td className="min-w-[8.5rem]">
                  <div className="flex flex-col gap-1">
                    {lines.map((line, i) => (
                      <span key={i} className={cn("whitespace-nowrap font-medium", line.colorClass)}>
                        {line.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="tabular-nums">
                  <div className="flex flex-col gap-1">
                    {lines.map((line, i) => (
                      <span key={i} className={line.colorClass}>
                        {money.format(line.priceCents / 100)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Pill tone={product.isPublished ? "on" : "off"}>{product.isPublished ? "Showing" : "Hidden"}</Pill>
                    <form action={toggleProductPublished.bind(null, product.id)}>
                      <LinkButton>{product.isPublished ? "Hide" : "Show"}</LinkButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BooksGrid({ products }: { products: BookRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const lines = formatLines(product);
        return (
          <div key={product.id} className="flex flex-col rounded-tile border border-line-strong bg-ground p-4">
            <div className="flex items-start gap-3">
              <Thumb
                src={product.coverImageUrl}
                alt=""
                title={product.title}
                from={product.coverFrom}
                to={product.coverTo}
              />
              <div className="min-w-0">
                <Link
                  href={`/educational-material/books/${product.id}`}
                  className="block truncate font-semibold text-ink hover:text-brand hover:underline"
                >
                  {product.title}
                </Link>
                <p className="truncate text-[13px] text-ink-muted">{product.author}</p>
                {product.inventoryStatus && (
                  <div className="mt-1.5">
                    <InventoryStatusCell status={product.inventoryStatus} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3.5 space-y-1.5">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between rounded-btn bg-tile-3 px-3 py-2 text-[13px]">
                  <span className={cn("font-semibold", line.colorClass)}>{line.label}</span>
                  <span className="text-ink-muted">Stock: {line.stock}</span>
                  <span className={cn("font-medium tabular-nums", line.colorClass)}>
                    {money.format(line.priceCents / 100)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3.5">
              <Pill tone={product.isPublished ? "on" : "off"}>{product.isPublished ? "Showing" : "Hidden"}</Pill>
              <form action={toggleProductPublished.bind(null, product.id)}>
                <LinkButton>{product.isPublished ? "Hide" : "Show"}</LinkButton>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
