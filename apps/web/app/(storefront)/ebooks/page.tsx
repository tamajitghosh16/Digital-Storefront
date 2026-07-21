import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_EBOOKS } from "@/lib/sample-data";
import { CatalogueGrid } from "@/components/catalogue-grid";

export const metadata: Metadata = { title: "E-Books" };

// FR-2.1: e-book catalogue with genre filtering. This listing page didn't
// exist before — only the /ebooks/[slug] detail page did.
export default async function EbooksCataloguePage() {
  const ebooks = await withFallback(
    () =>
      prisma.product.findMany({
        where: { type: "EBOOK", isPublished: true },
        orderBy: { createdAt: "desc" },
      }),
    SAMPLE_EBOOKS
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-3xl font-medium text-brand-navy">E-Books</h1>
      <p className="mt-1 text-sm text-muted-foreground">Instant delivery to your digital library.</p>

      <div className="mt-8">
        <CatalogueGrid products={ebooks} emptyLabel="No titles in this genre yet." />
      </div>
    </div>
  );
}
