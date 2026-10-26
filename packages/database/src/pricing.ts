/**
 * The storefront's admin-editable pricing rules, read as one plain object.
 *
 * apps/web's `lib/pricing.ts` holds the *arithmetic* (what a tier costs, how
 * much GST is inside a price); this module holds the *numbers* the Publisher
 * controls from apps/admin. Keeping them apart matters because the cart and
 * buy box are Client Components — they receive this config as a prop from a
 * Server Component rather than importing Prisma into the browser bundle.
 *
 * Every field has a default equal to what the storefront shipped with, so a
 * missing row or an unreachable database degrades to the old hardcoded
 * behaviour instead of pricing everything at zero.
 */

/** PricingSettings is a singleton row, read/written at this fixed id. */
export const PRICING_SETTINGS_ID = "singleton";

export interface ClassSetTierConfig {
  quantity: number;
  /** Fraction off the single-copy price: 0.1 = 10% off. */
  discount: number;
}

export interface PricingConfig {
  delivery: {
    freeOverCents: number;
    expressFeeCents: number;
    sameDayFeeCents: number;
    standardEta: string;
    expressEta: string;
    sameDayEta: string;
  };
  bundleEbookAddCents: number;
  /** GST as a fraction, by product type. Printed books are nil-rated (HSN 4901). */
  gstRates: {
    PHYSICAL_BOOK: number;
    EBOOK: number;
    SERVICE_PACKAGE: number;
  };
  classSetBaseCents: number;
  classSetTiers: ClassSetTierConfig[];
  // Discount codes are deliberately not part of this config: it's sent to
  // the browser as a prop, and the code list must never be. They're looked
  // up one at a time on the server — apps/web's lib/discounts.ts.
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  delivery: {
    freeOverCents: 150_000,
    expressFeeCents: 14_900,
    sameDayFeeCents: 24_900,
    standardEta: "in 3-5 working days",
    expressEta: "next working day",
    sameDayEta: "by 9pm today",
  },
  bundleEbookAddCents: 30_000,
  gstRates: { PHYSICAL_BOOK: 0, EBOOK: 0.18, SERVICE_PACKAGE: 0.18 },
  classSetBaseCents: 49_900,
  classSetTiers: [
    { quantity: 1, discount: 0 },
    { quantity: 10, discount: 0.1 },
    { quantity: 30, discount: 0.18 },
    { quantity: 100, discount: 0.24 },
  ],
};

/** Basis points → fraction. 1800 → 0.18. */
export function bpsToRate(bps: number): number {
  return bps / 10_000;
}

/** Fraction → basis points, for writing a percentage typed in the admin form. */
export function rateToBps(rate: number): number {
  return Math.round(rate * 10_000);
}
