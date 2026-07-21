import { z } from "zod";

function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

// Site-wide branding/SEO/contact info, rendered by apps/web's root layout,
// header, and footer.
export const siteSettingsFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  tagline: optional(z.string()),
  metaTitle: optional(z.string()),
  metaDescription: optional(z.string()),
  ogImageUrl: optional(z.string().url("Must be a valid URL")),
  logoUrl: optional(z.string().url("Must be a valid URL")),
  contactEmail: optional(z.string().email("Must be a valid email")),
  contactPhone: optional(z.string()),
  addressLine: optional(z.string()),
  twitterUrl: optional(z.string().url("Must be a valid URL")),
  facebookUrl: optional(z.string().url("Must be a valid URL")),
  instagramUrl: optional(z.string().url("Must be a valid URL")),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;
