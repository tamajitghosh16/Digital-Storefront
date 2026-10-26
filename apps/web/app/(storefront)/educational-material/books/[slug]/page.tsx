import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { productsCache, reviveDates } from "@/lib/products-cache";
import { getCachedPricingConfig } from "@/lib/cms";
import { SAMPLE_BOOKS, type DisplayBook } from "@/lib/sample-data";
import { bookToListing, productRating, type BookWithEditions } from "@/lib/books";
import { getCurrentUser } from "@repo/auth/server";
import { BookPage, type BookEditionOffer } from "@/components/commerce/book-page";
import { ownsEbook } from "@/lib/library";
import type { ProductTileData } from "@/components/commerce/product-tile";

/**
 * The book's row with its editions (one per format it's sold in). Scoped
 * to `productLine: "BOOK"` so a chart or teaching aid's slug doesn't render
 * as a book here — those have their own line's `[slug]` route. Cached under
 * the `products` tag (`lib/products-cache`); generateMetadata and the page
 * share one lookup per request through the cache.
 */
const cachedBook = productsCache("book-row", (slug: string) =>
  prisma.product.findFirst({
    where: { slug, productLine: "BOOK" },
    include: { editions: { orderBy: { format: "asc" } } },
  })
);

const cachedRelatedBooks = productsCache("book-related", (slug: string) =>
  prisma.product.findMany({
    where: { isPublished: true, type: { in: ["PHYSICAL_BOOK", "EBOOK"] }, productLine: "BOOK", NOT: { slug } },
    include: { editions: { select: { format: true, priceCents: true, stockQty: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  })
);

async function loadBook(slug: string): Promise<DisplayBook | BookWithEditions | null> {
  const row = await withFallback(async () => {
    const found = await cachedBook(slug);
    return found ? { ...reviveDates(found), editions: found.editions.map(reviveDates) } : null;
  }, null);
  return row ?? SAMPLE_BOOKS.find((book) => book.slug === slug) ?? null;
}

// Admin-controlled per-product SEO — see the apps/admin catalogue form.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await loadBook((await params).slug);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description || undefined,
    openGraph: product.ogImageUrl ? { images: [product.ogImageUrl] } : undefined,
  };
}

// FR-2.1/FR-2.2: full title details with a format picker offering each
// edition the book is sold in — Paperback, Hardcover and/or E-book.
export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [book, pricing, relatedRows] = await Promise.all([
    loadBook(slug),
    getCachedPricingConfig(),
    withFallback(
      async () => (await cachedRelatedBooks(slug)).map((row) => ({ ...reviveDates(row) })),
      SAMPLE_BOOKS.filter((entry) => entry.slug !== slug) as BookWithEditions[]
    ),
  ]);
  if (!book || !book.isPublished) notFound();

  const related: ProductTileData[] = relatedRows
    .slice(0, 8)
    .map(bookToListing)
    .map((listing) => ({
      id: listing.id,
      type: listing.hasPrint ? "PHYSICAL_BOOK" : "EBOOK",
      title: listing.title,
      author: listing.author,
      slug: listing.slug,
      priceCents: listing.fromPriceCents,
      coverImageUrl: listing.coverImageUrl ?? null,
      stockQty: listing.stockQty,
      genre: listing.genre,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      coverFrom: listing.coverFrom,
      coverTo: listing.coverTo,
    }));

  // Per-reader, so never cached: whether they already own the e-book.
  const user = await withFallback(() => getCurrentUser(), null);
  const sellsEbook = book.editions.some((edition) => edition.format === "EBOOK");
  const ebookOwned = user && sellsEbook ? await withFallback(() => ownsEbook(user.id, [book.id]), false) : false;

  // The book-level merchandising status gates every printed edition — the
  // same rule checkout applies before it will sell a printed copy.
  const printHeld = book.inventoryStatus === "OUT_OF_STOCK" || book.inventoryStatus === "COMING_SOON";
  const editions: BookEditionOffer[] = book.editions.map((edition) => ({
    format: edition.format,
    priceCents: edition.priceCents,
    stockQty: edition.stockQty,
    unavailable:
      edition.format === "EBOOK"
        ? ebookOwned
          ? "Already in your library"
          : undefined
        : book.inventoryStatus === "COMING_SOON"
          ? "Coming soon"
          : printHeld || (edition.stockQty !== null && edition.stockQty <= 0)
            ? "Out of stock"
            : undefined,
  }));

  const display = book as Partial<DisplayBook>;

  return (
    <BookPage
      related={related}
      pricing={pricing}
      isSignedIn={Boolean(user)}
      editions={editions}
      product={{
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        coverImageUrl: book.coverImageUrl,
        backCoverImageUrl: book.backCoverImageUrl,
        prefaceImageUrl: book.prefaceImageUrl,
        indexPageImageUrl: book.indexPageImageUrl,
        isbn: book.isbn,
        pages: display.pages,
        weightGrams: book.weightGrams,
        language: book.language,
        formats: book.formats,
        genre: book.genre ?? undefined,
        rating: productRating(book),
        reviewCount: book.reviewCount,
        coverFrom: display.coverFrom,
        coverTo: display.coverTo,
      }}
    />
  );
}
