// The storefront-shaped view of the shared demo catalogue. The seed data
// itself lives in @repo/database (src/book-catalog.ts) so the same 100
// titles back the database seed and the admin's list; here each seed is
// expanded into the two display rows the storefront groups back together
// (printed edition + e-book), with the display-only fields the schema
// does not carry.

import { BOOK_SEEDS } from "@repo/database";
import { baseProductFields, type DisplayProduct } from "./shared";

export const SAMPLE_BOOKS: DisplayProduct[] = BOOK_SEEDS.map((b) => ({
  ...baseProductFields(),
  id: `${b.id}-physical`,
  type: "PHYSICAL_BOOK",
  title: b.title,
  author: b.author,
  slug: b.slug,
  description: `${b.description}\n\n${b.pages} pages.`,
  priceCents: b.physicalPriceCents,
  coverImageUrl: null,
  stockQty: b.stockQty,
  isbn: b.isbn,
  weightGrams: 320,
  formats: [],
  sampleUrl: null,
  turnaroundDays: null,
  pages: b.pages,
  genre: b.genre,
  rating: b.rating,
  reviewCount: b.reviewCount,
  coverFrom: b.coverFrom,
  coverTo: b.coverTo,
})) as DisplayProduct[];

export const SAMPLE_EBOOKS: DisplayProduct[] = BOOK_SEEDS.map((b) => ({
  ...baseProductFields(),
  id: `${b.id}-ebook`,
  type: "EBOOK",
  title: b.title,
  author: b.author,
  slug: `${b.slug}-ebook`,
  description: b.description,
  priceCents: b.ebookPriceCents,
  coverImageUrl: null,
  stockQty: null,
  isbn: null,
  formats: ["EPUB", "MOBI", "PDF"],
  sampleUrl: null,
  turnaroundDays: null,
  pages: b.pages,
  genre: b.genre,
  rating: b.rating,
  reviewCount: Math.round(b.reviewCount * 0.6),
  coverFrom: b.coverFrom,
  coverTo: b.coverTo,
})) as DisplayProduct[];
