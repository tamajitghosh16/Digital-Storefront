/**
 * Discount-code rules: whether a code may be used right now, and how much it
 * takes off an order.
 *
 * Pure data and arithmetic, no Prisma import — like `pricing.ts`, so the
 * cart (a Client Component) can show the same saving the server will charge,
 * and apps/admin can describe a code with the same words. The *lookups*
 * (find the row, count how often it's been used) live with each caller:
 * apps/web's `lib/discounts.ts` at checkout, apps/admin's Discount page for
 * the usage column.
 *
 * Amounts are in paise; a percentage is in basis points (500 = 5%).
 */

export type DiscountKind = "PERCENT" | "FLAT";

/** What a code takes off — safe to send to the shopper who typed it. */
export interface DiscountTerms {
  code: string;
  type: DiscountKind;
  rateBps: number;
  amountOffCents: number;
  maxDiscountCents: number | null;
  minOrderCents: number;
}

/** Everything that decides whether a code may be used at all. */
export interface DiscountRules extends DiscountTerms {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
}

/**
 * Order statuses that count as having *used* a code. A PENDING order is an
 * online checkout that hasn't been paid (and may never be), so it doesn't
 * burn a use; a cancelled or refunded one gives its use back.
 */
export const REDEEMED_ORDER_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "READY_FOR_DOWNLOAD"] as const;

export type DiscountRejection = "INACTIVE" | "NOT_STARTED" | "EXPIRED" | "USED_UP" | "CUSTOMER_LIMIT";

/**
 * Why a code can't be used right now, or null when it can. The minimum order
 * isn't checked here — that depends on the cart, and a code below its
 * minimum is still a valid code, it just takes nothing off yet.
 */
export function discountRejection(
  rules: DiscountRules,
  usage: { now: Date; redemptions: number; customerRedemptions?: number }
): DiscountRejection | null {
  if (!rules.isActive) return "INACTIVE";
  if (rules.startsAt && usage.now < rules.startsAt) return "NOT_STARTED";
  if (rules.expiresAt && usage.now > rules.expiresAt) return "EXPIRED";
  if (rules.usageLimit !== null && usage.redemptions >= rules.usageLimit) return "USED_UP";
  if (
    rules.perCustomerLimit !== null &&
    usage.customerRedemptions !== undefined &&
    usage.customerRedemptions >= rules.perCustomerLimit
  ) {
    return "CUSTOMER_LIMIT";
  }
  return null;
}

/**
 * How much a code takes off an item subtotal (before delivery). Zero below
 * the minimum order; never more than the subtotal itself, so a ₹500-off code
 * on a ₹300 basket makes the items free rather than the total negative.
 */
export function discountAmountCents(terms: DiscountTerms, subtotalCents: number): number {
  if (subtotalCents <= 0 || subtotalCents < terms.minOrderCents) return 0;
  let off =
    terms.type === "FLAT" ? terms.amountOffCents : Math.round((subtotalCents * terms.rateBps) / 10_000);
  if (terms.type === "PERCENT" && terms.maxDiscountCents !== null) off = Math.min(off, terms.maxDiscountCents);
  return Math.max(0, Math.min(off, subtotalCents));
}

/**
 * The GST still inside a GST-inclusive subtotal once a discount has come off
 * it. The discount is spread across the lines in proportion to their value,
 * so the tax shrinks by the same fraction the subtotal did.
 */
export function gstAfterDiscountCents(gstCents: number, subtotalCents: number, discountCents: number): number {
  if (discountCents <= 0 || subtotalCents <= 0) return gstCents;
  return Math.round((gstCents * (subtotalCents - discountCents)) / subtotalCents);
}

// ── Wording ─────────────────────────────────────────────────────────

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function formatDiscountRupees(cents: number): string {
  return rupees.format(cents / 100).replace(/\.00$/, "");
}

function formatPercent(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}

/** "10% off (up to ₹200)" / "₹100 off" — the headline of a code. */
export function describeDiscount(terms: DiscountTerms): string {
  if (terms.type === "FLAT") return `${formatDiscountRupees(terms.amountOffCents)} off`;
  const cap = terms.maxDiscountCents !== null ? ` (up to ${formatDiscountRupees(terms.maxDiscountCents)})` : "";
  return `${formatPercent(terms.rateBps)} off${cap}`;
}

export type DiscountStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "USED_UP" | "OFF";

/** Where a code stands right now, for the admin list. */
export function discountStatus(rules: DiscountRules, now: Date, redemptions: number): DiscountStatus {
  switch (discountRejection(rules, { now, redemptions })) {
    case null:
      return "ACTIVE";
    case "INACTIVE":
      return "OFF";
    case "NOT_STARTED":
      return "SCHEDULED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "USED_UP";
  }
}
