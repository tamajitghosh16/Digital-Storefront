import { z } from "zod";
import { safeHref } from "@/lib/schema-fields";

// Header/footer navigation shown by apps/web's root layout — replaces what
// used to be hardcoded <a> tags there.
export const navLinkFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "That's too long"),
  href: safeHref(),
  location: z.enum(["HEADER", "FOOTER"]),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type NavLinkFormValues = z.infer<typeof navLinkFormSchema>;
