import "server-only";
import {
  REDEEMED_ORDER_STATUSES,
  discountRejection,
  prisma,
  type DiscountCode,
  type DiscountRejection,
  type DiscountTerms,
} from "@repo/database";

/**
 * Looks up one discount code and decides whether it can be used right now.
 * The rules themselves are pure and shared (`@repo/database`'s
 * discounts.ts); this adds the database half — the row and how often it has
 * been used — which is why it's server-only. The code list itself never
 * leaves the server: callers get back only the code that was typed.
 */

export type ResolvedDiscount =
  | { ok: true; row: DiscountCode; terms: DiscountTerms }
  | { ok: false; reason: DiscountRejection | "UNKNOWN" };

/** Same shape the cart's input and checkout's zod schema accept. */
const CODE_PATTERN = /^[A-Z0-9-]{2,24}$/;

export function normaliseDiscountCode(raw: unknown): string | null {
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return CODE_PATTERN.test(code) ? code : null;
}

export function discountTerms(row: DiscountCode): DiscountTerms {
  return {
    code: row.code,
    type: row.type,
    rateBps: row.rateBps,
    amountOffCents: row.amountOffCents,
    maxDiscountCents: row.maxDiscountCents,
    minOrderCents: row.minOrderCents,
  };
}

/**
 * `userId` is optional because the cart lets a signed-out shopper try a
 * code; the per-customer limit is then checked when they place the order
 * (checkout requires sign-in).
 */
export async function resolveDiscount(rawCode: string, userId?: string | null): Promise<ResolvedDiscount> {
  const code = normaliseDiscountCode(rawCode);
  if (!code) return { ok: false, reason: "UNKNOWN" };

  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row) return { ok: false, reason: "UNKNOWN" };

  const redeemed = { discountCodeId: row.id, status: { in: [...REDEEMED_ORDER_STATUSES] } };
  const [redemptions, customerRedemptions] = await Promise.all([
    row.usageLimit !== null ? prisma.order.count({ where: redeemed }) : Promise.resolve(0),
    row.perCustomerLimit !== null && userId
      ? prisma.order.count({ where: { ...redeemed, userId } })
      : Promise.resolve(undefined),
  ]);

  const reason = discountRejection(row, { now: new Date(), redemptions, customerRedemptions });
  if (reason) return { ok: false, reason };
  return { ok: true, row, terms: discountTerms(row) };
}
