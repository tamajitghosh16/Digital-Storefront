import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPricingConfig, prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { findSampleProduct, SAMPLE_EBOOKS, type DisplayProduct } from "@/lib/sample-data";
import { ProductPage, type ProductPageData } from "@/components/commerce/product-page";
import type { ProductTileData } from "@/components/commerce/product-tile";

// Admin-controlled per-product SEO — see the apps/admin catalogue form.
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

// FR-2.1/FR-2.2: e-book detail with format list and instant delivery.
export default async function EbookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product || product.type !== "EBOOK") notFound();

  const printSlug = slug.replace(/-ebook$/, "");

  const [companionRow, related, pricing] = await Promise.all([
    withFallback(() => prisma.product.findUnique({ where: { slug: printSlug } }), null),
    withFallback(
      () =>
        prisma.product.findMany({
          where: { type: "EBOOK", isPublished: true, NOT: { slug } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      SAMPLE_EBOOKS.filter((ebook) => ebook.slug !== slug).slice(0, 8)
    ),
    getPricingConfig(),
  ]);

  const companion = companionRow ?? findSampleProduct(printSlug);

  const display = product as Partial<DisplayProduct>;

  return (
    <ProductPage
      companionPriceCents={companion?.priceCents}
      related={related as ProductTileData[]}
      pricing={pricing}
      product={
        {
          ...product,
          type: "EBOOK",
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
