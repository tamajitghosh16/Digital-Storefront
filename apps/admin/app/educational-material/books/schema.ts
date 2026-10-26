import { z } from "zod";
import { httpsUrl } from "@/lib/schema-fields";

/** Turns "" / missing FormData entries into `undefined` before the inner schema runs. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

function checkbox() {
  return z.preprocess((v) => v === "on" || v === "true", z.boolean());
}

function optionalPrice() {
  return optional(z.coerce.number().min(0, "Price must be zero or positive"));
}

function optionalInt() {
  return z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().optional());
}

// FR-11.1: fields for the admin catalogue create/edit form. Prices are
// entered in rupees here and converted to paise in actions.ts, since
// that's what a human editing the catalogue expects to type.
export const productFormSchema = z
  .object({
    isService: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    // Only meaningful when isService is false — a book is sold in any one,
    // any two, or all three of these, and must be at least one.
    formatPaperback: checkbox(),
    formatHardcover: checkbox(),
    formatEbook: checkbox(),
    title: z.string().min(1, "Title is required").max(300, "That's too long"),
    author: z.string().min(1, "Author is required").max(300, "That's too long"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
    description: optional(z.string().max(5000, "That's too long")),
    // Only meaningful for books — drives the storefront's genre filter.
    genre: optional(z.string().max(500, "That's too long")),
    // Books only — shown on the product page as "Language: …".
    language: optional(z.string().trim().max(100, "That's too long")),
    // A service package's one price. A book is priced per format instead,
    // below — each picked format needs its own price.
    price: optionalPrice(),
    paperbackPrice: optionalPrice(),
    hardcoverPrice: optionalPrice(),
    ebookPrice: optionalPrice(),
    // Printed copies on hand, per printed format. Empty = not tracked.
    paperbackStock: optionalInt(),
    hardcoverStock: optionalInt(),
    coverImageUrl: optional(httpsUrl()),
    backCoverImageUrl: optional(httpsUrl()),
    prefaceImageUrl: optional(httpsUrl()),
    indexPageImageUrl: optional(httpsUrl()),
    isbn: optional(z.string().max(500, "That's too long")),
    weightGrams: optionalInt(),
    formats: optional(z.string().max(500, "That's too long")),
    // The e-book PDF, uploaded straight to Supabase Storage by PdfField
    // before the form is submitted — these three hidden inputs carry the
    // stored object path, original filename and size. Only meaningful when
    // formatEbook is checked.
    ebookFilePath: optional(z.string().max(500, "That's too long")),
    ebookFileName: optional(z.string().max(500, "That's too long")),
    ebookFileSize: optionalInt(),
    sampleUrl: optional(httpsUrl()),
    turnaroundDays: optionalInt(),
    metaTitle: optional(z.string().max(200, "That's too long")),
    metaDescription: optional(z.string().max(500, "That's too long")),
    ogImageUrl: optional(httpsUrl()),
    isPublished: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((data) => data.isService || data.formatPaperback || data.formatHardcover || data.formatEbook, {
    message: "Pick at least one format: paperback, hardcover or e-book",
    path: ["formatPaperback"],
  })
  .refine((data) => !data.isService || data.price !== undefined, { message: "Price is required", path: ["price"] })
  .refine((data) => data.isService || !data.formatPaperback || data.paperbackPrice !== undefined, {
    message: "Enter a price for the paperback",
    path: ["paperbackPrice"],
  })
  .refine((data) => data.isService || !data.formatHardcover || data.hardcoverPrice !== undefined, {
    message: "Enter a price for the hardcover",
    path: ["hardcoverPrice"],
  })
  .refine((data) => data.isService || !data.formatEbook || data.ebookPrice !== undefined, {
    message: "Enter a price for the e-book",
    path: ["ebookPrice"],
  })
  .refine((data) => (data.paperbackStock ?? 0) >= 0 && (data.hardcoverStock ?? 0) >= 0, {
    message: "Stock can't be negative",
    path: ["paperbackStock"],
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
