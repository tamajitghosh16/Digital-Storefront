import { z } from "zod";

function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

// Homepage hero/promo banners rendered by apps/web's home page.
export const bannerFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: optional(z.string()),
  imageUrl: optional(z.string().url("Must be a valid URL")),
  ctaText: optional(z.string()),
  ctaHref: optional(z.string()),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
