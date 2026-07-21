import { z } from "zod";

// Header/footer navigation shown by apps/web's root layout — replaces what
// used to be hardcoded <a> tags there.
export const navLinkFormSchema = z.object({
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Link target is required"),
  location: z.enum(["HEADER", "FOOTER"]),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type NavLinkFormValues = z.infer<typeof navLinkFormSchema>;
