import { z } from "zod";

/** Turns "" / missing FormData entries into `undefined` before the inner schema runs. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0),
});

// The line-item picker is a variable-length list, which a plain FormData
// can't carry — the form serializes it as JSON into a hidden "items" field
// instead, so this preprocess parses that string back into an array before
// the array schema below validates it.
export const purchaseOrderFormSchema = z.object({
  vendorId: z.string().min(1, "Pick a vendor"),
  expectedAt: optional(z.string()),
  notes: optional(z.string()),
  items: z.preprocess((v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, z.array(purchaseOrderItemSchema).min(1, "Add at least one item")),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
