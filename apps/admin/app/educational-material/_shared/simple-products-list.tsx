"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@repo/database";
import { LayoutGrid, List, Search } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { EmptyState, Pill, Thumb, controlClass } from "@/components/ui";
import { LinkButton } from "@/components/form-controls";
import { toggleLineProductPublished } from "./actions";
import { lineBasePath, type ProductLineConfig } from "./product-line-config";

/**
 * The interactive half of a line's inventory list: search, sort and
 * table/grid view, all client-side so they react without a server round
 * trip. The Server Component (`page.tsx`) only does the initial fetch,
 * filtered to this line's `productLine`.
 *
 * The same component as `../books/books-list.tsx`, minus the per-format
 * price/stock lines — these products are sold one way, at one price.
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

export function SimpleProductsList({ products, config }: { products: Product[]; config: ProductLineConfig }) {
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

  const lowerLabel = config.label.toLowerCase();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">All {config.label}</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${lowerLabel}`}
              aria-label={`Search ${lowerLabel}`}
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
          title={query ? "Nothing matches your search" : `No ${lowerLabel} yet`}
          description={
            query
              ? "Try a different title or name."
              : "Add your first item. You can upload its picture as part of the same form."
          }
        />
      ) : view === "table" ? (
        <ProductsTable products={filtered} config={config} />
      ) : (
        <ProductsGrid products={filtered} config={config} />
      )}
    </div>
  );
}

/** Status pill plus the hide/show toggle, bound to this line's route slug. */
function StatusToggle({ product, slug }: { product: Product; slug: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Pill tone={product.isPublished ? "on" : "off"}>{product.isPublished ? "Showing" : "Hidden"}</Pill>
      <form action={toggleLineProductPublished.bind(null, slug, product.id)}>
        <LinkButton>{product.isPublished ? "Hide" : "Show"}</LinkButton>
      </form>
    </div>
  );
}

function ProductsTable({ products, config }: { products: Product[]; config: ProductLineConfig }) {
  const base = lineBasePath(config.slug);
  return (
    <div className="overflow-x-auto rounded-tile border border-line-strong bg-ground">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="border-b border-line-strong text-left">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-medium [&>th]:text-ink-muted">
            <th>Sl. no</th>
            <th>Title</th>
            <th>{config.copy.makerLabel}</th>
            <th>Stock</th>
            <th>Price</th>
            <th className="text-right">&nbsp;</th>
          </tr>
        </thead>
        <tbody className="[&>tr:not(:last-child)]:border-b [&>tr:not(:last-child)]:border-line [&>tr>td]:px-4 [&>tr>td]:py-3 [&>tr]:align-middle">
          {products.map((product, index) => (
            <tr key={product.id}>
              <td className="tabular-nums text-ink-muted">{index + 1}</td>
              <td>
                <div className="flex items-center gap-3">
                  <Thumb src={product.coverImageUrl} alt="" title={product.title} />
                  <Link href={`${base}/${product.id}`} className="font-semibold text-ink hover:text-brand hover:underline">
                    {product.title}
                  </Link>
                </div>
              </td>
              <td className="text-ink-muted">{product.author}</td>
              <td className="tabular-nums text-ink-muted">{product.stockQty != null ? product.stockQty : "—"}</td>
              <td className="tabular-nums text-ink">{money.format(product.priceCents / 100)}</td>
              <td className="text-right">
                <StatusToggle product={product} slug={config.slug} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsGrid({ products, config }: { products: Product[]; config: ProductLineConfig }) {
  const base = lineBasePath(config.slug);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="flex flex-col rounded-tile border border-line-strong bg-ground p-4">
          <div className="flex items-start gap-3">
            <Thumb src={product.coverImageUrl} alt="" title={product.title} />
            <div className="min-w-0">
              <Link
                href={`${base}/${product.id}`}
                className="block truncate font-semibold text-ink hover:text-brand hover:underline"
              >
                {product.title}
              </Link>
              <p className="truncate text-[13px] text-ink-muted">
                <span className="sr-only">{config.copy.makerLabel}: </span>
                {product.author}
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between rounded-btn bg-tile-3 px-3 py-2 text-[13px]">
            <span className="text-ink-muted">Stock: {product.stockQty != null ? product.stockQty : "—"}</span>
            <span className="font-medium tabular-nums text-ink">{money.format(product.priceCents / 100)}</span>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3.5">
            <StatusToggle product={product} slug={config.slug} />
          </div>
        </div>
      ))}
    </div>
  );
}
