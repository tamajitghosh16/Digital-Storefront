import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPricingConfig, prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { findSampleProduct, SAMPLE_BOOKS, SAMPLE_EBOOKS, type DisplayProduct } from "@/lib/sample-data";
import { groupBookEditions, productRating } from "@/lib/books";
import { ProductPage, type ProductPageData } from "@/components/commerce/product-page";
import type { ProductTileData } from "@/components/commerce/product-tile";

/** A title is reachable at either edition's slug; both resolve here. */
function baseSlug(slug: string): string {
  return slug.replace(/-ebook$/, "");
}

// Admin-controlled per-product SEO — see the apps/admin catalogue form.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const base = baseSlug(slug);
  const product =
    (await withFallback(() => prisma.product.findUnique({ where: { slug: base } }), null)) ??
    (await withFallback(() => prisma.product.findUnique({ where: { slug: `${base}-ebook` } }), null)) ??
    findSampleProduct(base) ??
    findSampleProduct(`${base}-ebook`);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description || undefined,
    openGraph: product.ogImageUrl ? { images: [product.ogImageUrl] } : undefined,
  };
}

// FR-2.1/FR-2.2: full title details with an edition switcher. A title
// published in only one format simply offers that one edition.
export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = baseSlug(slug);

  const [printRow, ebookRow, pricing] = await Promise.all([
    withFallback(() => prisma.product.findUnique({ where: { slug: base } }), null),
    withFallback(() => prisma.product.findUnique({ where: { slug: `${base}-ebook` } }), null),
    getPricingConfig(),
  ]);

  const print = printRow ?? findSampleProduct(base) ?? null;
  const ebook = ebookRow ?? findSampleProduct(`${base}-ebook`) ?? null;
  const primary = print ?? ebook;
  if (!primary) notFound();

  // Other titles, one card per title (not per edition), and never the one
  // being viewed — take a wide slice so grouping still yields a full row.
  const relatedRows = await withFallback(
    () =>
      prisma.product.findMany({
        where: {
          isPublished: true,
          type: { in: ["PHYSICAL_BOOK", "EBOOK"] },
          NOT: { slug: { in: [base, `${base}-ebook`] } },
        },
        orderBy: { createdAt: "desc" },
        take: 24,
      }),
    [...SAMPLE_BOOKS, ...SAMPLE_EBOOKS].filter((book) => baseSlug(book.slug) !== base)
  );

  const related: ProductTileData[] = groupBookEditions(relatedRows)
    .slice(0, 8)
    .map((book) => ({
      id: book.id,
      type: book.hasPrint ? "PHYSICAL_BOOK" : "EBOOK",
      title: book.title,
      author: book.author,
      slug: book.slug,
      priceCents: book.fromPriceCents,
      coverImageUrl: book.coverImageUrl ?? null,
      stockQty: book.stockQty,
      genre: book.genre,
      rating: book.rating,
      reviewCount: book.reviewCount,
      coverFrom: book.coverFrom,
      coverTo: book.coverTo,
    }));

  const isEbook = primary.type === "EBOOK";
  const companion = isEbook ? print : ebook;
  const display = primary as Partial<DisplayProduct>;

  return (
    <ProductPage
      companionPriceCents={companion?.priceCents}
      related={related}
      pricing={pricing}
      product={
        {
          ...primary,
          type: primary.type === "EBOOK" ? "EBOOK" : "PHYSICAL_BOOK",
          genre: display.genre ?? undefined,
          rating: productRating(primary),
          reviewCount: display.reviewCount,
          pages: display.pages,
          coverFrom: display.coverFrom,
          coverTo: display.coverTo,
        } as ProductPageData
      }
    />
  );
}
