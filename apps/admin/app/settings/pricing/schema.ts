import { z } from "zod";

/**
 * The Publisher types rupees and percentages; the database stores paise and
 * basis points. Every conversion lives here so there's one place to check
 * when a number looks wrong on the storefront.
 */

const rupees = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} can't be negative`);

const percent = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} can't be negative`)
    .max(100, `${label} can't be more than 100%`);

/** ₹ → paise. */
export const toCents = (value: number) => Math.round(value * 100);
/** paise → ₹, for pre-filling the form. */
export const toRupees = (cents: number) => (cents / 100).toFixed(2);
/** % → basis points. */
export const toBps = (value: number) => Math.round(value * 100);
/** basis points → %, trimmed of trailing zeroes so "18" doesn't show as "18.00". */
export const toPercent = (bps: number) => String(Number((bps / 100).toFixed(2)));

export const pricingSettingsFormSchema = z.object({
  freeDeliveryOver: rupees("Free delivery threshold"),
  expressFee: rupees("Express delivery fee"),
  sameDayFee: rupees("Same-day delivery fee"),
  standardEta: z.string().min(1, "Standard delivery needs an arrival estimate"),
  expressEta: z.string().min(1, "Express delivery needs an arrival estimate"),
  sameDayEta: z.string().min(1, "Same-day delivery needs an arrival estimate"),
  bundleEbookAdd: rupees("E-book bundle price"),
  ebookGst: percent("GST on e-books"),
  serviceGst: percent("GST on services"),
  classSetBase: rupees("Example class-set price"),
});

export const classSetTierFormSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a whole number" })
    .int("Quantity must be a whole number")
    // A "tier" of one copy is the undiscounted price, which the storefront
    // always synthesises — accepting one here would let the Publisher put a
    // discount on it that silently never applies.
    .min(2, "A bulk tier has to be 2 copies or more"),
  discount: percent("Discount"),
});

export const discountCodeFormSchema = z.object({
  code: z
    .string()
    .min(2, "A code needs at least 2 characters")
    .max(24, "Keep codes under 24 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only — no spaces"),
  rate: percent("Discount").min(0.01, "A code has to take something off"),
  blurb: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
});

export type PricingSettingsFormValues = z.infer<typeof pricingSettingsFormSchema>;
export type ClassSetTierFormValues = z.infer<typeof classSetTierFormSchema>;
export type DiscountCodeFormValues = z.infer<typeof discountCodeFormSchema>;
