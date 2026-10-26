import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, type ProductLine } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { productsCache, reviveProduct } from "@/lib/products-cache";
import { getCachedPricingConfig } from "@/lib/cms";
import { countBookListings, fetchBookPage } from "@/lib/books-data";
import { BOOKS_PAGE_SIZE, parseBookQuery } from "@/lib/books-query";
import { productRating } from "@/lib/books";
import type { ListingLine } from "@/lib/product-lines";
import { BooksCatalogue } from "@/components/commerce/books-catalogue";
import { ProductPage, type ProductPageData } from "@/components/commerce/product-page";
import type { ProductTileData } from "@/components/commerce/product-tile";

/**
 * The listing and detail pages shared by the three simpler Educational
 * Materials lines — Educational Charts, Worksheets and Activity Puzzles,
 * Teaching and Learning Materials. Each route folder is a two-line wrapper
 * passing its `ListingLine`; the rows are whatever `apps/admin` wrote to
 * `Product` with that `productLine`, cached under the `products` tag that
 * an admin save expires (`lib/products-cache`).
 *
 * Books keep their own routes (`../books`) for the edition / e-book logic.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function LineListingPage({ line, searchParams }: { line: ListingLine; searchParams: SearchParams }) {
  const query = parseBookQuery(await searchParams);

  const [{ items, nextCursor }, total] = await Promise.all([
    fetchBookPage({ query, cursor: null, limit: BOOKS_PAGE_SIZE, productLine: line.productLine }),
    countBookListings(query, line.productLine),
  ]);

  return (
    <BooksCatalogue
      line={line}
      initialItems={items}
      initialCursor={nextCursor}
      total={total}
      availableGenres={[]}
      query={query}
    />
  );
}

/** One published row of this line, or `null` — never another line's item at the same slug. */
const cachedLineProduct = productsCache("line-product", (productLine: ProductLine, slug: string) =>
  prisma.product.findFirst({ where: { slug, productLine, isPublished: true } })
);

const cachedLineRelated = productsCache("line-related", (productLine: ProductLine, slug: string) =>
  prisma.product.findMany({
    where: { isPublished: true, productLine, NOT: { slug } },
    orderBy: { createdAt: "desc" },
    take: 8,
  })
);

function loadLineProduct(line: ListingLine, slug: string) {
  return withFallback(async () => reviveProduct(await cachedLineProduct(line.productLine, slug)), null);
}

// Admin-controlled per-product SEO — see the apps/admin line form.
export async function lineProductMetadata(line: ListingLine, slug: string): Promise<Metadata> {
  const product = await loadLineProduct(line, slug);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description || undefined,
    openGraph: product.ogImageUrl ? { images: [product.ogImageUrl] } : undefined,
  };
}

export async function LineProductPage({ line, slug }: { line: ListingLine; slug: string }) {
  const [product, pricing, relatedRows] = await Promise.all([
    loadLineProduct(line, slug),
    getCachedPricingConfig(),
    withFallback(async () => (await cachedLineRelated(line.productLine, slug)).map((row) => reviveProduct(row)), []),
  ]);
  if (!product) notFound();

  const related: ProductTileData[] = relatedRows.map((row) => ({
    id: row.id,
    type: "PHYSICAL_BOOK",
    title: row.title,
    author: row.author,
    slug: row.slug,
    href: `${line.base}/${row.slug}`,
    priceCents: row.priceCents,
    coverImageUrl: row.coverImageUrl ?? null,
    stockQty: row.stockQty,
    rating: productRating(row),
    reviewCount: row.reviewCount,
  }));

  return (
    <ProductPage
      line={line}
      related={related}
      pricing={pricing}
      product={
        {
          ...product,
          type: "PHYSICAL_BOOK",
          genre: undefined,
          rating: productRating(product),
          reviewCount: product.reviewCount,
        } as ProductPageData
      }
    />
  );
}
