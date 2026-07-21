import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Tablet, FileText } from "lucide-react";
import { prisma } from "@repo/database";
import { Badge } from "@repo/ui/badge";
import { Separator } from "@repo/ui/separator";
import { Button } from "@repo/ui/button";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { StarRating } from "@/components/star-rating";
import { withFallback } from "@/lib/safe-fetch";
import { findSampleProduct, type DisplayProduct } from "@/lib/sample-data";

// Admin-controlled per-product SEO — see apps/admin catalogue edit form.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description || undefined,
    openGraph: product.ogImageUrl ? { images: [product.ogImageUrl] } : undefined,
  };
}

// FR-2.1/FR-2.2: e-book detail page with sample preview. Falls back to
// sample data when there's no reachable database.
export default async function EbookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product || product.type !== "EBOOK") notFound();

  // Sample-data-only display fields (genre/rating/cover gradient) aren't part
  // of the Prisma Product schema, so read them off defensively.
  const display = product as Partial<DisplayProduct>;
  const { genre, rating, reviewCount, coverFrom, coverTo } = display;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-brand-navy">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 sm:grid-cols-2">
        <div
          className="relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-border"
          style={coverFrom && coverTo ? { backgroundImage: `linear-gradient(135deg, ${coverFrom}, ${coverTo})` } : undefined}
        >
          {product.coverImageUrl ? (
            <Image src={product.coverImageUrl} alt={product.title} fill sizes="(min-width: 640px) 40vw, 90vw" className="object-cover" />
          ) : coverFrom && coverTo ? (
            <div className="flex h-full items-center justify-center">
              <span className="font-serif text-5xl font-semibold text-white/90">
                {product.title.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-navy-50 to-brand-cream">
              <Tablet className="h-16 w-16 text-brand-navy/20" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="w-fit">E-book</Badge>
            {genre && <Badge variant="outline">{genre}</Badge>}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-brand-navy">{product.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {product.author}</p>
          {typeof rating === "number" && <div className="mt-2"><StarRating rating={rating} reviewCount={reviewCount} /></div>}

          {product.formats.length > 0 && (
            <div className="mt-3 flex gap-1.5">
              {product.formats.map((format) => (
                <Badge key={format} variant="outline">{format}</Badge>
              ))}
            </div>
          )}

          <p className="mt-5 text-2xl font-semibold text-foreground">₹{(product.priceCents / 100).toFixed(2)}</p>
          <p className="mt-1 text-sm text-emerald-700">Instant delivery to your library</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton
              product={{
                productId: product.id,
                title: product.title,
                priceCents: product.priceCents,
                fulfillmentType: "DIGITAL",
              }}
            />
            {product.sampleUrl && (
              <Button asChild variant="outline" size="lg">
                <a href={product.sampleUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" /> Read a sample
                </a>
              </Button>
            )}
          </div>

          <Separator className="my-7" />

          {product.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
