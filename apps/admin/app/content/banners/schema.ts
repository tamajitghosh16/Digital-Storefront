import { z } from "zod";
import { httpsUrl, safeHref } from "@/lib/schema-fields";

function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

// The homepage hero, plus any promo banners queued behind it. The lowest
// `order` is what apps/web renders as the hero; the rest are held in reserve.
export const bannerFormSchema = z.object({
  eyebrow: optional(z.string().max(120, "That's too long")),
  title: z.string().min(1, "The headline is required").max(300, "That's too long"),
  subtitle: optional(z.string().max(500, "That's too long")),
  imageUrl: optional(httpsUrl()),
  ctaText: optional(z.string().max(80, "That's too long")),
  ctaHref: optional(safeHref()),
  secondaryCtaText: optional(z.string().max(80, "That's too long")),
  secondaryCtaHref: optional(safeHref()),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
