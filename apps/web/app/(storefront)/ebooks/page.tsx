import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_EBOOKS } from "@/lib/sample-data";
import { CataloguePage } from "@/components/commerce/catalogue-page";
import type { CatalogueQuery } from "@/components/commerce/catalogue-toolbar";
import type { ProductTileData } from "@/components/commerce/product-tile";

export const metadata: Metadata = { title: "E-Books" };

// FR-2.1: e-book catalogue. Same listing component as /books — only the
// heading, standfirst and product type differ.
export default async function EbooksCataloguePage({ searchParams }: { searchParams: Promise<CatalogueQuery> }) {
  const [ebooks, query] = await Promise.all([
    withFallback(
      () => prisma.product.findMany({ where: { type: "EBOOK", isPublished: true }, orderBy: { createdAt: "desc" } }),
      SAMPLE_EBOOKS
    ),
    searchParams,
  ]);

  return (
    <CataloguePage
      basePath="/ebooks"
      title="E-Books"
      standfirst="EPUB, MOBI and PDF delivered to your library the moment payment clears. DRM-free, and yours to read on anything."
      products={ebooks as ProductTileData[]}
      query={query}
    />
  );
}
