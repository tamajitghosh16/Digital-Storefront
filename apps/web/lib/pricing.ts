/**
 * Storefront pricing rules.
 *
 * The *numbers* — delivery thresholds and fees, the print + e-book bundle
 * uplift, GST rates, class-set tiers, discount codes — live in the database
 * and are edited from apps/admin (Pricing & delivery). This module holds the
 * arithmetic that turns them into what a shopper sees.
 *
 * Everything here takes the config as an argument rather than importing it,
 * because the buy box and the cart are Client Components: a Server Component
 * loads `getPricingConfig()` once and hands the result down as a prop, so no
 * Prisma code ends up in the browser bundle.
 *
 * Three mechanics are still ahead of the data model — `Product` carries a
 * single `priceCents` with no quantity breaks, bundle price or tax class —
 * so they're derived here from the printed price. This stays the one place
 * to delete from when the schema catches up.
 *
 * Everything is in paise (cents) to match `Product.priceCents`.
 */

import type { ClassSetTierConfig, PricingConfig } from "@repo/database";

export type { ClassSetTierConfig, PricingConfig };
export type TaxableType = keyof PricingConfig["gstRates"];

// ── Local formatter ─────────────────────────────────────────────────
// `lib/format.ts` owns the app-wide formatters; this module needs one to
// build the delivery labels, so it keeps a private whole-rupee version
// rather than creating an import cycle.

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatRupees(cents: number): string {
  return rupees.format(cents / 100);
}

// ── Delivery ────────────────────────────────────────────────────────
// One source for the threshold, so the promo strip, the buy box and the
// cart summary can never quote different numbers at each other.

export type DeliverySpeed = "standard" | "express" | "same-day";

export interface DeliveryOption {
  value: DeliverySpeed;
  label: string;
  feeCents: number;
}

export function deliveryOptions(config: PricingConfig): DeliveryOption[] {
  const { freeOverCents, expressFeeCents, sameDayFeeCents, standardEta, expressEta, sameDayEta } = config.delivery;
  return [
    {
      value: "standard",
      label: `Standard — free over ${formatRupees(freeOverCents)}, arrives ${standardEta}`,
      feeCents: 0,
    },
    {
      value: "express",
      label: `Express — ${formatRupees(expressFeeCents)}, arrives ${expressEta}`,
      feeCents: expressFeeCents,
    },
    {
      value: "same-day",
      label: `Same Day Delivery (Kolkata) — ${formatRupees(sameDayFeeCents)}, ${sameDayEta}`,
      feeCents: sameDayFeeCents,
    },
  ];
}

/** "Free delivery on orders over ₹1,500" — quoted in the promo strip and the buy box. */
export function freeDeliveryCopy(config: PricingConfig): string {
  return `Free delivery on orders over ${formatRupees(config.delivery.freeOverCents)}`;
}

/** Delivery charged on a subtotal, before any discount code. */
export function deliveryFeeCents(
  config: PricingConfig,
  subtotalCents: number,
  speed: DeliverySpeed = "standard"
): number {
  if (subtotalCents <= 0) return 0;
  if (speed === "express") return config.delivery.expressFeeCents;
  if (speed === "same-day") return config.delivery.sameDayFeeCents;
  return subtotalCents >= config.delivery.freeOverCents ? 0 : config.delivery.expressFeeCents;
}

// ── Class sets ──────────────────────────────────────────────────────
// Schools and reading groups buy one title in quantity. The per-copy price
// falls at each tier the Publisher has configured; digital editions have no
// tiers because there is nothing to print.

/** Per-copy price at a tier, rounded to whole rupees the way a price list would be. */
export function tierUnitCents(baseCents: number, discount: number): number {
  return Math.round((baseCents * (1 - discount)) / 100) * 100;
}

/** The configured tier matching a quantity, falling back to full price. */
export function tierForQuantity(tiers: ClassSetTierConfig[], quantity: number): ClassSetTierConfig {
  return tiers.find((tier) => tier.quantity === quantity) ?? tiers[0] ?? { quantity: 1, discount: 0 };
}

// ── Editions ────────────────────────────────────────────────────────
// Most titles are listed twice — a printed edition and an e-book. The
// bundle adds a flat amount to the printed copy rather than a percentage,
// so class-set pricing still applies cleanly to the printed half.

export type EditionKind = "print" | "ebook" | "both";

export interface Edition {
  kind: EditionKind;
  label: string;
  detail: string;
  /** Fulfilment promise shown under the price once this edition is picked. */
  note: string;
  priceCents: number;
  /** Undisclosed when there's no saving to show. */
  listCents?: number;
  /**
   * The bundle uplift baked into this edition, carried along so re-pricing
   * at a class-set tier doesn't need the whole config passed in again.
   */
  bundleAddCents?: number;
}

export function buildEditions({
  printCents,
  ebookCents,
  pages,
  formats = ["EPUB", "MOBI", "PDF"],
  bundleAddCents,
}: {
  printCents?: number;
  ebookCents?: number;
  pages?: number | null;
  formats?: string[];
  bundleAddCents: number;
}): Edition[] {
  const editions: Edition[] = [];

  if (printCents !== undefined) {
    editions.push({
      kind: "print",
      label: "Printed edition",
      detail: pages ? `Paperback, ${pages} pages` : "Paperback",
      note: "Paperback · ships today from Kolkata",
      priceCents: printCents,
    });
  }

  if (ebookCents !== undefined) {
    editions.push({
      kind: "ebook",
      label: "E-book",
      detail: formats.join(" · "),
      note: `${formats.join(", ")} · instant download`,
      priceCents: ebookCents,
    });
  }

  if (printCents !== undefined && ebookCents !== undefined) {
    editions.push({
      kind: "both",
      label: "Both editions",
      detail: "Save on the pair",
      note: "E-book unlocks now, paperback ships today",
      priceCents: printCents + bundleAddCents,
      listCents: printCents + ebookCents,
      bundleAddCents,
    });
  }

  return editions;
}

/** Per-copy price for an edition at a given printed-copy tier price. */
export function editionUnitCents(edition: Edition, printUnitCents: number): number {
  if (edition.kind === "ebook") return edition.priceCents;
  if (edition.kind === "both") return printUnitCents + (edition.bundleAddCents ?? 0);
  return printUnitCents;
}

// ── Tax ─────────────────────────────────────────────────────────────
// Prices are quoted GST-inclusive (Indian retail convention), so tax is
// extracted from the line rather than added to it.

/** The GST already contained in a tax-inclusive amount. */
export function includedGstCents(
  amountCents: number,
  type: TaxableType,
  rates: PricingConfig["gstRates"]
): number {
  const rate = rates[type];
  if (!rate) return 0;
  return Math.round((amountCents * rate) / (1 + rate));
}

// ── Discount codes ──────────────────────────────────────────────────

export function lookupDiscount(config: PricingConfig, code: string) {
  const wanted = code.trim().toUpperCase();
  return config.discountCodes.find((candidate) => candidate.code === wanted);
}
