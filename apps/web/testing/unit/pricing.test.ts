import { describe, expect, it } from "vitest";
import type { PricingConfig } from "@repo/database";
import { deliveryFeeCents, includedGstCents, tierForQuantity, tierUnitCents } from "@/lib/pricing";

// A fixed config rather than DEFAULT_PRICING_CONFIG: importing the
// @repo/database root would load the Prisma client, and these tests should
// keep passing when the Publisher's defaults change.
const config: PricingConfig = {
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
  ],
};

describe("deliveryFeeCents", () => {
  it("is free on an empty cart", () => {
    expect(deliveryFeeCents(config, 0)).toBe(0);
  });

  it("charges below the free-delivery threshold", () => {
    expect(deliveryFeeCents(config, 149_999)).toBe(14_900);
  });

  it("is free at or over the threshold", () => {
    expect(deliveryFeeCents(config, 150_000)).toBe(0);
  });

  it("always charges for faster speeds", () => {
    expect(deliveryFeeCents(config, 500_000, "express")).toBe(14_900);
    expect(deliveryFeeCents(config, 500_000, "same-day")).toBe(24_900);
  });
});

describe("class-set tiers", () => {
  it("rounds a tier price to whole rupees", () => {
    // ₹499 less 10% = ₹449.10 → ₹449
    expect(tierUnitCents(49_900, 0.1)).toBe(44_900);
  });

  it("falls back to the first tier for an unlisted quantity", () => {
    expect(tierForQuantity(config.classSetTiers, 7)).toEqual({ quantity: 1, discount: 0 });
  });
});

describe("includedGstCents", () => {
  it("extracts GST from a tax-inclusive price", () => {
    // ₹118 including 18% GST contains ₹18 of tax.
    expect(includedGstCents(11_800, "EBOOK", config.gstRates)).toBe(1_800);
  });

  it("is zero for nil-rated printed books", () => {
    expect(includedGstCents(49_900, "PHYSICAL_BOOK", config.gstRates)).toBe(0);
  });
});
