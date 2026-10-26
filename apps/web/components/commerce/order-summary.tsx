import { cn } from "@repo/ui/utils";
// The browser-safe subpath: the package root would pull Prisma into the bundle.
import { discountAmountCents, gstAfterDiscountCents } from "@repo/database/discounts";
import type { AppliedCoupon } from "@/lib/checkout-store";
import type { CartItem } from "@/lib/cart-store";
import { formatINRWhole } from "@/lib/format";
import { deliveryFeeCents, includedGstCents, type PricingConfig } from "@/lib/pricing";

/**
 * The cart's running totals, shared by the cart and the payment page so the
 * two can never show different sums for the same basket. Display only — the
 * server prices the actual charge from the database.
 *
 * It opens at *list* price so the bundle saving reads as a real deduction
 * rather than a second discount on an already-discounted sum. GST is per
 * line — printed books are nil-rated, services are 18%. Delivery is always
 * standard: checkout no longer offers a speed. A discount code comes off the
 * item subtotal by the same shared rule checkout charges with
 * (`discountAmountCents`), so the two can't disagree.
 */
export function cartTotals(items: CartItem[], pricing: PricingConfig, coupon: AppliedCoupon | null) {
  let listSubtotal = 0;
  let subtotal = 0;
  let units = 0;
  let gst = 0;

  for (const item of items) {
    const net = item.priceCents * item.quantity;
    listSubtotal += (item.listPriceCents ?? item.priceCents) * item.quantity;
    subtotal += net;
    units += item.quantity;
    gst += includedGstCents(net, item.taxType ?? "PHYSICAL_BOOK", pricing.gstRates);
  }

  const discount = coupon ? discountAmountCents(coupon, subtotal) : 0;
  // A valid code below its minimum order takes nothing off yet; say how far off it is.
  const couponShortfall = coupon && subtotal > 0 && subtotal < coupon.minOrderCents ? coupon.minOrderCents - subtotal : 0;
  const delivery = deliveryFeeCents(pricing, subtotal, "standard");

  return {
    listSubtotal,
    subtotal,
    units,
    bundleSaving: listSubtotal - subtotal,
    discount,
    discountCode: discount > 0 && coupon ? coupon.code : null,
    couponCode: coupon?.code ?? null,
    couponShortfall,
    delivery,
    total: subtotal - discount + delivery,
    gst: gstAfterDiscountCents(gst, subtotal, discount),
  };
}

export type CartTotals = ReturnType<typeof cartTotals>;

/** The summary rows and GST note; the caller adds its own heading and button. */
export function SummaryLines({ totals }: { totals: CartTotals }) {
  return (
    <>
      <div className="mt-4">
        <SummaryRow label={`Items (${totals.units}) at list`} value={formatINRWhole(totals.listSubtotal)} />
        {totals.bundleSaving > 0 && (
          <SummaryRow label="Bundle saving" value={`−${formatINRWhole(totals.bundleSaving)}`} good />
        )}
        {totals.discount > 0 && (
          <SummaryRow label={`Discount (${totals.discountCode})`} value={`−${formatINRWhole(totals.discount)}`} good />
        )}
        {totals.couponShortfall > 0 && (
          <p className="py-1 text-[13px] text-ink-muted">
            Add {formatINRWhole(totals.couponShortfall)} more to use {totals.couponCode}.
          </p>
        )}
        <SummaryRow label="Delivery" value={totals.delivery === 0 ? "Free" : formatINRWhole(totals.delivery)} />
        <div className="mt-2.5 flex justify-between gap-3 border-t border-line pt-4 text-xl font-bold tracking-[-0.02em]">
          <span>Total</span>
          <span className="tabular-nums">{formatINRWhole(totals.total)}</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {totals.gst > 0
          ? `Includes ${formatINRWhole(totals.gst)} GST — printed books are nil-rated, services are taxed at 18%.`
          : "No GST on this order — printed books are nil-rated."}
      </p>
    </>
  );
}

function SummaryRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2 text-sm">
      <span>{label}</span>
      <span className={cn("tabular-nums", good && "font-bold text-ok")}>{value}</span>
    </div>
  );
}
