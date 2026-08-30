import { z } from "zod";

/** Turns "" / missing FormData entries into `undefined` before the inner schema runs. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

function optionalInt() {
  return z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().optional());
}

// FR-11.1: fields for the admin catalogue create/edit form. Prices are
// entered in rupees here and converted to priceCents in actions.ts, since
// that's what a human editing the catalogue expects to type.
export const productFormSchema = z
  .object({
    isService: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    // Only meaningful when isService is false — a book must be at least one of these.
    formatPhysical: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    formatEbook: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    title: z.string().min(1, "Title is required"),
    author: z.string().min(1, "Author is required"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
    description: optional(z.string()),
    // Only meaningful for books — drives the storefront's genre filter.
    genre: optional(z.string()),
    price: z.coerce.number().min(0, "Price must be zero or positive"),
    // Only used when both formatPhysical and formatEbook are checked — the
    // e-book gets its own, usually lower, price. `price` above is the
    // physical price in that case; the sole price otherwise.
    ebookPrice: optional(z.coerce.number().min(0, "Price must be zero or positive")),
    coverImageUrl: optional(z.string().url("Must be a valid URL")),
    stockQty: optionalInt(),
    isbn: optional(z.string()),
    weightGrams: optionalInt(),
    formats: optional(z.string()),
    sampleUrl: optional(z.string().url("Must be a valid URL")),
    turnaroundDays: optionalInt(),
    metaTitle: optional(z.string()),
    metaDescription: optional(z.string()),
    ogImageUrl: optional(z.string().url("Must be a valid URL")),
    isPublished: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((data) => data.isService || data.formatPhysical || data.formatEbook, {
    message: "Pick at least one format: physical book or e-book",
    path: ["formatPhysical"],
  })
  .refine((data) => !(data.formatPhysical && data.formatEbook) || data.ebookPrice !== undefined, {
    message: "E-book price is required when both formats are available",
    path: ["ebookPrice"],
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
