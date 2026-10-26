import { z } from "zod";
import { ORDER_STATUSES } from "./order-status";

/** An empty input arrives as "" — treat it as "not set". */
const blankToUndefined = (value: unknown) =>
  value == null || (typeof value === "string" && value.trim() === "") ? undefined : value;

/**
 * The "Update this order" form. `expectedStatus` is the status the page was
 * showing when it rendered, so a change someone else made in the meantime
 * is caught instead of silently overwritten.
 */
export const orderUpdateFormSchema = z.object({
  expectedStatus: z.enum(ORDER_STATUSES),
  // Absent (the "Keep it as it is" choice) means only the tracking details change.
  status: z.preprocess(blankToUndefined, z.enum(ORDER_STATUSES).optional()),
  carrier: z.preprocess(blankToUndefined, z.string().trim().max(60, "The courier name is too long").optional()),
  trackingNumber: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .max(60, "The tracking number is too long")
      .regex(/^[A-Za-z0-9-]+$/, "The tracking number can only have letters, numbers and dashes — no spaces")
      .optional()
  ),
});
