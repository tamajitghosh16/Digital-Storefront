/**
 * The three formats a book is sold in, and the one cart/checkout line-id
 * convention both apps rely on.
 *
 * A book has one `BookEdition` row per format it's sold in — any one, any
 * two, or all three. The order here is the order every screen lists them
 * in (admin form, admin list, storefront format picker).
 *
 * Pure data — no Prisma import — so Client Components can use it. The
 * `BookFormatValue` union mirrors the Prisma `BookFormat` enum by hand for
 * the same reason; the `satisfies` below keeps the two from drifting.
 */

import type { BookFormat } from "@prisma/client";

export type BookFormatValue = "PAPERBACK" | "HARDCOVER" | "EBOOK";

export const BOOK_FORMATS = [
  { value: "PAPERBACK", label: "Paperback", slug: "paperback", isPrint: true },
  { value: "HARDCOVER", label: "Hardcover", slug: "hardcover", isPrint: true },
  { value: "EBOOK", label: "E-book", slug: "ebook", isPrint: false },
] as const satisfies readonly { value: BookFormat & BookFormatValue; label: string; slug: string; isPrint: boolean }[];

export type BookFormatSlug = (typeof BOOK_FORMATS)[number]["slug"];

export const PRINT_BOOK_FORMATS: BookFormatValue[] = ["PAPERBACK", "HARDCOVER"];

export function bookFormatLabel(format: BookFormatValue): string {
  return BOOK_FORMATS.find((entry) => entry.value === format)?.label ?? format;
}

export function isPrintFormat(format: BookFormatValue): boolean {
  return format !== "EBOOK";
}

/** Sorts editions (or anything with a `format`) into canonical Paperback → Hardcover → E-book order. */
export function sortByBookFormat<T extends { format: BookFormatValue }>(rows: T[]): T[] {
  const rank = (format: BookFormatValue) => BOOK_FORMATS.findIndex((entry) => entry.value === format);
  return [...rows].sort((a, b) => rank(a.format) - rank(b.format));
}

/**
 * Cart/checkout line id for one edition of a book: `<productId>:paperback`,
 * `<productId>:hardcover`, `<productId>:ebook`. A non-book product's line
 * id is its bare product id.
 */
export function bookLineId(productId: string, format: BookFormatValue): string {
  const slug = BOOK_FORMATS.find((entry) => entry.value === format)?.slug ?? "paperback";
  return `${productId}:${slug}`;
}

/** The inverse of {@link bookLineId}. `format` is null for a bare product id. */
export function parseLineId(lineId: string): { productId: string; format: BookFormatValue | null } {
  const [productId = "", slug] = lineId.split(":");
  const match = BOOK_FORMATS.find((entry) => entry.slug === slug);
  return { productId, format: match ? match.value : null };
}
