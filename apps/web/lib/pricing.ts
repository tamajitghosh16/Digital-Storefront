/**
 * Storefront pricing rules.
 *
 * Three mechanics in the approved design are ahead of the data model —
 * `Product` in packages/database carries a single `priceCents` and no
 * quantity breaks, bundle price or tax class. They're derived here from
 * the printed price so the UI is honest and consistent, and so there is
 * one place to delete from when the schema catches up:
 *
 *   1. class-set quantity tiers (1 / 10 / 30 / 100 copies)
 *   2. the print + e-book bundle
 *   3. per-line GST — printed books are nil-rated, services are 18%
 *
 * Everything is in paise (cents) to match `Product.priceCents`.
 */

// ── Local formatter ─────────────────────────────────────────────────
// `lib/format.ts` owns the app-wide formatters; this module needs one at
// module scope to build its copy constants, so it keeps a private
// whole-rupee version rather than creating an import cycle. It has to be
// declared before the constants that call it — `const` doesn't hoist.

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

export const DELIVERY = {
  freeOverCents: 150_000,
  expressFeeCents: 14_900,
  sameDayFeeCents: 24_900,
  standardEta: "Tue 4 Aug",
} as const;

export type DeliverySpeed = "standard" | "express" | "same-day";

export interface DeliveryOption {
  value: DeliverySpeed;
  label: string;
  feeCents: number;
}

export function deliveryOptions(): DeliveryOption[] {
  return [
    {
      value: "standard",
      label: `Standard — free over ${formatRupees(DELIVERY.freeOverCents)}, arrives ${DELIVERY.standardEta}`,
      feeCents: 0,
    },
    {
      value: "express",
      label: `Express — ${formatRupees(DELIVERY.expressFeeCents)}, arrives Sat 1 Aug`,
      feeCents: DELIVERY.expressFeeCents,
    },
    {
      value: "same-day",
      label: `Same Day Delivery (Kolkata) — ${formatRupees(DELIVERY.sameDayFeeCents)}, by 9pm today`,
      feeCents: DELIVERY.sameDayFeeCents,
    },
  ];
}

/** "Free delivery on orders over ₹1,500" — quoted in the promo strip and the buy box. */
export const FREE_DELIVERY_COPY = `Free delivery on orders over ${formatRupees(DELIVERY.freeOverCents)}`;

/** Delivery charged on a subtotal, before any discount code. */
export function deliveryFeeCents(subtotalCents: number, speed: DeliverySpeed = "standard"): number {
  if (subtotalCents <= 0) return 0;
  if (speed === "express") return DELIVERY.expressFeeCents;
  if (speed === "same-day") return DELIVERY.sameDayFeeCents;
  return subtotalCents >= DELIVERY.freeOverCents ? 0 : DELIVERY.expressFeeCents;
}

// ── Class sets ──────────────────────────────────────────────────────
// Schools and reading groups buy one title in quantity. The per-copy
// price falls at 10, 30 and 100 copies; digital editions have no tiers
// because there is nothing to print.

export interface ClassSetTier {
  quantity: number;
  /** Fraction off the single-copy price, 0 at the base tier. */
  discount: number;
}

export const CLASS_SET_TIERS: ClassSetTier[] = [
  { quantity: 1, discount: 0 },
  { quantity: 10, discount: 0.1 },
  { quantity: 30, discount: 0.18 },
  { quantity: 100, discount: 0.24 },
];

/** Per-copy price at a tier, rounded to whole rupees the way a price list would be. */
export function tierUnitCents(baseCents: number, discount: number): number {
  return Math.round((baseCents * (1 - discount)) / 100) * 100;
}

// ── Editions ────────────────────────────────────────────────────────
// Most titles are listed twice — a printed edition and an e-book. The
// bundle adds a flat amount to the printed copy rather than a percentage,
// so class-set pricing still applies cleanly to the printed half.

export const BUNDLE_EBOOK_ADD_CENTS = 30_000;

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
}

export function buildEditions({
  printCents,
  ebookCents,
  pages,
  formats = ["EPUB", "MOBI", "PDF"],
}: {
  printCents?: number;
  ebookCents?: number;
  pages?: number | null;
  formats?: string[];
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
      priceCents: printCents + BUNDLE_EBOOK_ADD_CENTS,
      listCents: printCents + ebookCents,
    });
  }

  return editions;
}

/** Per-copy price for an edition at a given printed-copy tier price. */
export function editionUnitCents(edition: Edition, printUnitCents: number): number {
  if (edition.kind === "ebook") return edition.priceCents;
  if (edition.kind === "both") return printUnitCents + BUNDLE_EBOOK_ADD_CENTS;
  return printUnitCents;
}

// ── Tax ─────────────────────────────────────────────────────────────
// Prices are quoted GST-inclusive (Indian retail convention), so tax is
// extracted from the line rather than added to it.

export const GST_RATES = {
  /** Printed books are nil-rated under HSN 4901. */
  PHYSICAL_BOOK: 0,
  EBOOK: 0.18,
  SERVICE_PACKAGE: 0.18,
} as const;

export type TaxableType = keyof typeof GST_RATES;

/** The GST already contained in a tax-inclusive amount. */
export function includedGstCents(amountCents: number, type: TaxableType): number {
  const rate = GST_RATES[type];
  if (!rate) return 0;
  return Math.round((amountCents * rate) / (1 + rate));
}

// ── Discount codes ──────────────────────────────────────────────────

export const DISCOUNT_CODES: Record<string, { rate: number; blurb: string }> = {
  SCHOOL5: { rate: 0.05, blurb: "5% off this order." },
};

export function lookupDiscount(code: string) {
  return DISCOUNT_CODES[code.trim().toUpperCase()];
}
