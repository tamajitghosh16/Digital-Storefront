import { z } from "zod";

/** Turns "" / missing FormData entries into `undefined` before the inner schema runs. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

export const vendorFormSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contactName: optional(z.string()),
  email: optional(z.string().email("Must be a valid email")),
  phone: optional(z.string()),
  gstin: optional(z.string()),
  addressLine: optional(z.string()),
  city: optional(z.string()),
  state: optional(z.string()),
  postalCode: optional(z.string()),
  notes: optional(z.string()),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
