"use client";
import { useMemo, useState } from "react";
import { cn } from "@repo/ui/utils";
import { ProductCard, type ProductCardData } from "./product-card";

// Client component: holds the genre filter-chip state (mirrors the
// mockup's filter-bar) over a server-fetched (or sample-data) product list.
export function CatalogueGrid({ products, emptyLabel }: { products: ProductCardData[]; emptyLabel: string }) {
  const genres = useMemo(() => {
    const set = new Set(products.map((p) => p.genre).filter((g): g is string => !!g));
    return set.size > 0 ? ["All", ...Array.from(set)] : [];
  }, [products]);

  const [active, setActive] = useState("All");
  const filtered = active === "All" ? products : products.filter((p) => p.genre === active);

  return (
    <div>
      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActive(g)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active === g
                  ? "border-brand-navy-solid bg-brand-navy-solid text-white"
                  : "border-border text-muted-foreground hover:border-brand-navy/40 hover:text-foreground"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}
