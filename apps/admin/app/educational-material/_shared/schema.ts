import { z } from "zod";

/**
 * Fields for the create/edit form shared by the three simpler Educational
 * Materials lines (charts, worksheets/puzzles, teaching materials). A pared
 * back version of `../books/schema.ts`: these are all plain shippable
 * physical products, so there's no service toggle, no format picker, no
 * genre and no e-book fields — just the item, its price, its stock and the
 * printed-product details needed for postage.
 *
 * Prices are entered in rupees and converted to `priceCents` in
 * `actions.ts`, matching what a human editing the catalogue expects to type.
 */

/** Turns "" / missing FormData entries into `undefined` before the inner schema runs. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

function optionalInt() {
  return z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0, "Must be zero or more").optional());
}

export const simpleProductFormSchema = z.object({
  title: z.string().min(1, "A title is required"),
  // Stored in Product.author — labelled "Publisher or brand" / "Author or
  // creator" per line, but always required so the column is never blank.
  maker: z.string().min(1, "This field is required"),
  slug: z
    .string()
    .min(1, "Web address is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Web address must be lowercase letters, numbers, and hyphens only"),
  description: optional(z.string()),
  price: z.coerce.number().min(0, "Price must be zero or positive"),
  coverImageUrl: optional(z.string().url("Must be a valid URL")),
  stockQty: optionalInt(),
  // A generic product code / ISBN — kept in Product.isbn, which is otherwise
  // books-only and unused for these lines.
  code: optional(z.string()),
  weightGrams: optionalInt(),
  metaTitle: optional(z.string()),
  metaDescription: optional(z.string()),
  ogImageUrl: optional(z.string().url("Must be a valid URL")),
  isPublished: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type SimpleProductFormValues = z.infer<typeof simpleProductFormSchema>;
