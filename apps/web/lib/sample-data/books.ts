// The storefront-shaped view of the shared demo catalogue. The seed data
// itself lives in @repo/database (src/book-catalog.ts); here each seed is
// expanded the way prisma/seed.ts writes it — one row per title with a
// `BookEdition` per format (Paperback, Hardcover when the seed prices one,
// E-book) — plus the display-only fields the schema does not carry.
// `BOOK_SEEDS` is empty during the testing phase, so this array is
// currently empty — the offline fallback shows no books until the
// catalogue is re-seeded.

import { BOOK_SEEDS, type BookEdition } from "@repo/database";
import { NOW, baseProductFields, type DisplayProduct } from "./shared";

export type DisplayBook = DisplayProduct & { editions: BookEdition[] };

function edition(productId: string, format: BookEdition["format"], priceCents: number, stockQty: number | null): BookEdition {
  return { id: `${productId}-${format.toLowerCase()}`, productId, format, priceCents, stockQty, createdAt: NOW, updatedAt: NOW };
}

export const SAMPLE_BOOKS: DisplayBook[] = BOOK_SEEDS.map((b) => {
  const editions = [
    edition(b.id, "PAPERBACK", b.physicalPriceCents, b.stockQty),
    ...(b.hardcoverPriceCents !== undefined ? [edition(b.id, "HARDCOVER", b.hardcoverPriceCents, b.stockQty)] : []),
    edition(b.id, "EBOOK", b.ebookPriceCents, null),
  ];
  return {
    ...baseProductFields(),
    id: b.id,
    type: "PHYSICAL_BOOK",
    productLine: "BOOK",
    title: b.title,
    author: b.author,
    slug: b.slug,
    description: `${b.description}\n\n${b.pages} pages.`,
    priceCents: Math.min(...editions.map((entry) => entry.priceCents)),
    coverImageUrl: null,
    stockQty: null,
    isbn: b.isbn,
    weightGrams: 320,
    formats: ["EPUB", "MOBI", "PDF"],
    sampleUrl: null,
    turnaroundDays: null,
    pages: b.pages,
    genre: b.genre,
    rating: b.rating,
    reviewCount: b.reviewCount,
    coverFrom: b.coverFrom,
    coverTo: b.coverTo,
    editions,
  } as DisplayBook;
});
