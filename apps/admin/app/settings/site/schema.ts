import { z } from "zod";
import { httpsUrl } from "@/lib/schema-fields";

function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

// Site-wide branding/SEO/contact info, rendered by apps/web's root layout,
// header, and footer.
export const siteSettingsFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required").max(200, "That's too long"),
  tagline: optional(z.string().max(300, "That's too long")),
  metaTitle: optional(z.string().max(200, "That's too long")),
  metaDescription: optional(z.string().max(500, "That's too long")),
  ogImageUrl: optional(httpsUrl()),
  logoUrl: optional(httpsUrl()),
  contactEmail: optional(z.string().max(500, "That's too long").email("Must be a valid email")),
  contactPhone: optional(z.string().max(500, "That's too long")),
  addressLine: optional(z.string().max(300, "That's too long")),
  twitterUrl: optional(httpsUrl()),
  facebookUrl: optional(httpsUrl()),
  instagramUrl: optional(httpsUrl()),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;
