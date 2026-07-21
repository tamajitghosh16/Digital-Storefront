import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_BOOKS } from "@/lib/sample-data";
import { CatalogueGrid } from "@/components/catalogue-grid";

export const metadata: Metadata = { title: "Physical Books" };

// FR-2.1: physical-book catalogue with genre filtering. This listing page
// didn't exist before — only the /books/[slug] detail page did — so the
// header's "Physical Books" link had nowhere real to go.
export default async function BooksCataloguePage() {
  const books = await withFallback(
    () =>
      prisma.product.findMany({
        where: { type: "PHYSICAL_BOOK", isPublished: true },
        orderBy: { createdAt: "desc" },
      }),
    SAMPLE_BOOKS
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-3xl font-medium text-brand-navy">Physical Books</h1>
      <p className="mt-1 text-sm text-muted-foreground">Printed titles, shipped to your door.</p>

      <div className="mt-8">
        <CatalogueGrid products={books} emptyLabel="No titles in this genre yet." />
      </div>
    </div>
  );
}
