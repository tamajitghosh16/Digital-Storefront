import { z } from "zod";

/**
 * The "Add new Coupon" form. Staff type rupees, percentages and calendar
 * dates; the database stores paise, basis points and instants — every
 * conversion happens in `toDiscountCodeData` so there's one place to check
 * when a code behaves differently from what was typed.
 */

/** An empty input arrives as "" — treat it as "not set" rather than as 0. */
const blankToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);

const optionalRupees = (label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ invalid_type_error: `${label} must be a number` })
      .min(0, `${label} can't be negative`)
      .max(10_00_000, `${label} is too large`)
      .optional()
  );

const optionalCount = (label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ invalid_type_error: `${label} must be a whole number` })
      .int(`${label} must be a whole number`)
      .min(1, `${label} has to be at least 1 — leave it empty for no limit`)
      .max(1_000_000, `${label} is too large`)
      .optional()
  );

const optionalDate = (label: string) =>
  z.preprocess(blankToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} isn't a valid date`).optional());

const optionalText = (max: number, label: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${label} is too long`).optional());

export const discountCodeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "A code needs at least 2 characters")
      .max(24, "Keep codes under 24 characters")
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only — no spaces"),
    type: z.enum(["PERCENT", "FLAT"], { errorMap: () => ({ message: "Pick a discount type" }) }),
    value: z.coerce.number({ invalid_type_error: "The discount must be a number" }).positive("A code has to take something off"),
    maxDiscount: optionalRupees("Maximum discount"),
    minOrder: optionalRupees("Minimum order"),
    startsOn: optionalDate("Start date"),
    expiresOn: optionalDate("End date"),
    usageLimit: optionalCount("Total uses"),
    perCustomerLimit: optionalCount("Uses per customer"),
    blurb: optionalText(120, "The message for shoppers"),
    internalNote: optionalText(500, "The internal note"),
    isActive: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  })
  .superRefine((values, ctx) => {
    if (values.type === "PERCENT" && values.value > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "A percentage discount can't be more than 100%" });
    }
    if (values.type === "FLAT" && values.value > 10_00_000) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "That discount is too large" });
    }
    if (values.startsOn && values.expiresOn && values.expiresOn < values.startsOn) {
      ctx.addIssue({ code: "custom", path: ["expiresOn"], message: "The end date is before the start date" });
    }
    if (values.usageLimit && values.perCustomerLimit && values.perCustomerLimit > values.usageLimit) {
      ctx.addIssue({
        code: "custom",
        path: ["perCustomerLimit"],
        message: "Uses per customer can't be more than the total uses",
      });
    }
  });

export type DiscountCodeFormValues = z.infer<typeof discountCodeFormSchema>;

/** ₹ → paise. */
const toCents = (rupees: number) => Math.round(rupees * 100);

/**
 * Dates are calendar days in India: a code "valid until 31 Dec" works to the
 * last minute of 31 Dec IST, wherever the server happens to run.
 */
const startOfDayIst = (day: string) => new Date(`${day}T00:00:00.000+05:30`);
const endOfDayIst = (day: string) => new Date(`${day}T23:59:59.999+05:30`);

export function toDiscountCodeData(values: DiscountCodeFormValues) {
  const isPercent = values.type === "PERCENT";
  return {
    // Stored upper-cased so checkout can upper-case what the shopper types
    // and match exactly, rather than needing a case-insensitive query.
    code: values.code.toUpperCase(),
    type: values.type,
    rateBps: isPercent ? Math.round(values.value * 100) : 0,
    amountOffCents: isPercent ? 0 : toCents(values.value),
    // A cap only means something on a percentage: a flat code is its own cap.
    maxDiscountCents: isPercent && values.maxDiscount ? toCents(values.maxDiscount) : null,
    minOrderCents: values.minOrder ? toCents(values.minOrder) : 0,
    startsAt: values.startsOn ? startOfDayIst(values.startsOn) : null,
    expiresAt: values.expiresOn ? endOfDayIst(values.expiresOn) : null,
    usageLimit: values.usageLimit ?? null,
    perCustomerLimit: values.perCustomerLimit ?? null,
    blurb: values.blurb ?? null,
    internalNote: values.internalNote ?? null,
    isActive: values.isActive,
  };
}
