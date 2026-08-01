import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Callout, Stars } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { BookJacket, ProductShot } from "./book-jacket";

/**
 * The catalogue tile.
 *
 * Order is deliberate: jacket, title, author, rating, price, then the
 * other editions, then the delivery promise. Price sits *below* the
 * title at normal weight — the reference storefront leads with price
 * because it sells commodity print; a book is chosen by title first.
 */

export interface ProductTileData {
  id: string;
  type: "PHYSICAL_BOOK" | "EBOOK" | "SERVICE_PACKAGE";
  title: string;
  author: string;
  slug: string;
  priceCents: number;
  coverImageUrl?: string | null;
  stockQty?: number | null;
  genre?: string;
  rating?: number;
  reviewCount?: number;
  coverFrom?: string;
  coverTo?: string;
}

const TYPE_PATH = {
  PHYSICAL_BOOK: "books",
  EBOOK: "ebooks",
  SERVICE_PACKAGE: "services",
} as const;

/** Delivery promise, and its tone — the one line shoppers scan for. */
function fulfilment(product: ProductTileData): { text: string; tone: string } {
  if (product.type === "EBOOK") return { text: "Instant download", tone: "text-ok" };
  if (product.type === "SERVICE_PACKAGE") return { text: "Starts on upload", tone: "text-ok" };

  const stock = product.stockQty ?? 0;
  if (stock <= 0) return { text: "Out of stock", tone: "text-sale" };
  if (stock <= 12) return { text: `Only ${stock} left`, tone: "text-warn" };
  if (stock >= 30) return { text: "Same Day Delivery — Kolkata", tone: "text-ok" };
  return { text: "Ships in 2 days", tone: "text-ok" };
}

export function ProductTile({
  product,
  flag,
  ebookCents,
  bundleCents,
  className,
}: {
  product: ProductTileData;
  /** Pill in the shot's top-left — "Bestseller", "New". */
  flag?: { label: string; tone?: "brand" | "tile" };
  ebookCents?: number;
  bundleCents?: number;
  className?: string;
}) {
  const href = `/${TYPE_PATH[product.type]}/${product.slug}`;
  const ship = fulfilment(product);

  const alternates = [
    ebookCents !== undefined && `E-book ${formatINRWhole(ebookCents)}`,
    bundleCents !== undefined && `Both ${formatINRWhole(bundleCents)}`,
  ].filter(Boolean);

  return (
    <Link href={href} className={cn("group flex flex-col", className)}>
      <ProductShot className="transition-transform duration-200 group-hover:-translate-y-[3px]">
        {flag && (
          <Callout tone={flag.tone ?? "brand"} className="absolute left-3 top-3">
            {flag.label}
          </Callout>
        )}
        <BookJacket
          title={product.title}
          author={product.author}
          coverImageUrl={product.coverImageUrl}
          from={product.coverFrom}
          to={product.coverTo}
          className="w-[62%]"
        />
      </ProductShot>

      <p className="mt-2 text-[15px] font-bold leading-[1.3] group-hover:underline">{product.title}</p>
      <p className="text-[13px] text-ink-muted">{product.author}</p>

      {typeof product.rating === "number" && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
          <Stars rating={product.rating} />
          <span className="tabular-nums">
            {product.rating.toFixed(1)}
            {typeof product.reviewCount === "number" && ` (${product.reviewCount})`}
          </span>
        </p>
      )}

      <p className="mt-1 text-sm tabular-nums">{formatINRWhole(product.priceCents)}</p>
      {alternates.length > 0 && <p className="text-xs tabular-nums text-ink-muted">{alternates.join(" · ")}</p>}
      <p className={cn("mt-0.5 text-xs font-bold", ship.tone)}>{ship.text}</p>
    </Link>
  );
}

/** Horizontal shelf of tiles, snapping as it scrolls. */
export function ProductScroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex snap-x gap-4 overflow-x-auto pb-3.5 [&>*]:w-[196px] [&>*]:shrink-0 [&>*]:snap-start">
      {children}
    </div>
  );
}

/** Responsive grid of tiles. */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-x-4 gap-y-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">{children}</div>;
}
