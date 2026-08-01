import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_BOOKS, SAMPLE_EBOOKS } from "@/lib/sample-data";
import { CataloguePage } from "@/components/commerce/catalogue-page";
import type { CatalogueQuery } from "@/components/commerce/catalogue-toolbar";
import type { ProductTileData } from "@/components/commerce/product-tile";

export const metadata: Metadata = { title: "Books" };

// FR-2.1: physical-book catalogue with genre filtering and sorting.
export default async function BooksCataloguePage({ searchParams }: { searchParams: Promise<CatalogueQuery> }) {
  const [books, ebooks, query] = await Promise.all([
    withFallback(
      () => prisma.product.findMany({ where: { type: "PHYSICAL_BOOK", isPublished: true }, orderBy: { createdAt: "desc" } }),
      SAMPLE_BOOKS
    ),
    withFallback(
      () => prisma.product.findMany({ where: { type: "EBOOK", isPublished: true }, orderBy: { createdAt: "desc" } }),
      SAMPLE_EBOOKS
    ),
    searchParams,
  ]);

  // The e-book edition of the same title, keyed by the shared base slug,
  // so each tile can show "E-book ₹999" under the printed price.
  const companionPrices = new Map(
    (ebooks as ProductTileData[]).map((ebook) => [ebook.slug.replace(/-ebook$/, ""), ebook.priceCents])
  );

  return (
    <CataloguePage
      basePath="/books"
      title="Books"
      standfirst="Every printed title we publish, from the Ink & Imagination schoolroom list to the trade fiction imprint. Most are available as an e-book too."
      products={books as ProductTileData[]}
      query={query}
      companionPrices={companionPrices}
    />
  );
}
