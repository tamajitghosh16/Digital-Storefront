import { z } from "zod";

function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

// The homepage hero, plus any promo banners queued behind it. The lowest
// `order` is what apps/web renders as the hero; the rest are held in reserve.
export const bannerFormSchema = z.object({
  eyebrow: optional(z.string()),
  title: z.string().min(1, "The headline is required"),
  subtitle: optional(z.string()),
  imageUrl: optional(z.string().url("Must be a valid URL")),
  ctaText: optional(z.string()),
  ctaHref: optional(z.string()),
  secondaryCtaText: optional(z.string()),
  secondaryCtaHref: optional(z.string()),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
