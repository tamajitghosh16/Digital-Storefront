import { z } from "zod";

/** Turns "" / missing FormData entries into `undefined` before the inner schema runs. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

export const vendorFormSchema = z.object({
  name: z.string().min(1, "Vendor name is required").max(200, "That's too long"),
  contactName: optional(z.string().max(200, "That's too long")),
  email: optional(z.string().max(500, "That's too long").email("Must be a valid email")),
  phone: optional(z.string().max(500, "That's too long")),
  gstin: optional(z.string().max(500, "That's too long")),
  addressLine: optional(z.string().max(300, "That's too long")),
  city: optional(z.string().max(500, "That's too long")),
  state: optional(z.string().max(500, "That's too long")),
  postalCode: optional(z.string().max(500, "That's too long")),
  notes: optional(z.string().max(2000, "That's too long")),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
