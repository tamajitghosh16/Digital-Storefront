import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { findSampleProduct, SAMPLE_BOOKS, type DisplayProduct } from "@/lib/sample-data";
import { ProductPage, type ProductPageData } from "@/components/commerce/product-page";
import type { ProductTileData } from "@/components/commerce/product-tile";

// Admin-controlled per-product SEO (Meta title/description/OG image on the
// catalogue edit form in apps/admin), falling back to the product's own
// title and description.
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

// FR-2.1: full product details — description, price, cover, format,
// availability. Falls back to sample data when no database is reachable.
export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product || product.type !== "PHYSICAL_BOOK") notFound();

  const [companionRow, related] = await Promise.all([
    withFallback(() => prisma.product.findUnique({ where: { slug: `${slug}-ebook` } }), null),
    withFallback(
      () =>
        prisma.product.findMany({
          where: { type: "PHYSICAL_BOOK", isPublished: true, NOT: { slug } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      SAMPLE_BOOKS.filter((book) => book.slug !== slug).slice(0, 8)
    ),
  ]);

  const companion = companionRow ?? findSampleProduct(`${slug}-ebook`);

  // Display-only fields (genre, rating, jacket gradient) aren't part of the
  // Prisma schema, so they're read off defensively.
  const display = product as Partial<DisplayProduct>;

  return (
    <ProductPage
      companionPriceCents={companion?.priceCents}
      related={related as ProductTileData[]}
      product={
        {
          ...product,
          type: "PHYSICAL_BOOK",
          genre: display.genre,
          rating: display.rating,
          reviewCount: display.reviewCount,
          pages: display.pages,
          coverFrom: display.coverFrom,
          coverTo: display.coverTo,
        } as ProductPageData
      }
    />
  );
}
