import Link from "next/link";
import Image from "next/image";
import { BookOpen, Tablet, Sparkles, Star } from "lucide-react";
import { Badge } from "@repo/ui/badge";

export interface ProductCardData {
  id: string;
  type: "PHYSICAL_BOOK" | "EBOOK" | "SERVICE_PACKAGE";
  title: string;
  author: string;
  slug: string;
  priceCents: number;
  coverImageUrl: string | null;
  stockQty?: number | null;
  genre?: string;
  rating?: number;
  reviewCount?: number;
  coverFrom?: string;
  coverTo?: string;
}

const typeMeta = {
  PHYSICAL_BOOK: { path: "books", label: "Physical", Icon: BookOpen },
  EBOOK: { path: "ebooks", label: "E-book", Icon: Tablet },
  SERVICE_PACKAGE: { path: "services", label: "Service", Icon: Sparkles },
} as const;

export function ProductCard({ product }: { product: ProductCardData }) {
  const meta = typeMeta[product.type];
  const outOfStock = product.type === "PHYSICAL_BOOK" && (product.stockQty ?? 0) <= 0;

  const hasCoverGradient = product.coverFrom && product.coverTo;

  return (
    <Link href={`/${meta.path}/${product.slug}`} className="group block">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-border"
        style={
          hasCoverGradient
            ? { backgroundImage: `linear-gradient(135deg, ${product.coverFrom}, ${product.coverTo})` }
            : undefined
        }
      >
        {product.coverImageUrl ? (
          <Image
            src={product.coverImageUrl}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={
              hasCoverGradient
                ? "flex h-full items-center justify-center"
                : "flex h-full items-center justify-center bg-gradient-to-br from-brand-navy-50 to-brand-cream"
            }
          >
            {hasCoverGradient ? (
              <span className="font-serif text-2xl font-semibold text-white/90">
                {product.title
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            ) : (
              <meta.Icon className="h-9 w-9 text-brand-navy/25" strokeWidth={1.5} />
            )}
          </div>
        )}
        <Badge variant="muted" className="absolute left-2 top-2 bg-card/90 backdrop-blur">
          {meta.label}
        </Badge>
        {outOfStock && (
          <div className="absolute inset-x-0 bottom-0 bg-foreground/85 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-white">
            Out of stock
          </div>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        {product.genre && (
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-accent">{product.genre}</p>
        )}
        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand-navy">
          {product.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{product.author}</p>
        {typeof product.rating === "number" && (
          <div className="flex items-center gap-1 pt-0.5 text-brand-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3 w-3" fill={i < product.rating! ? "currentColor" : "none"} strokeWidth={1.5} />
            ))}
            {typeof product.reviewCount === "number" && (
              <span className="ml-1 text-[11px] text-muted-foreground">({product.reviewCount})</span>
            )}
          </div>
        )}
        <p className="pt-0.5 text-sm font-semibold text-brand-navy">₹{(product.priceCents / 100).toFixed(2)}</p>
      </div>
    </Link>
  );
}
