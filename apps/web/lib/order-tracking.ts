/**
 * What the "My Orders" detail dialog shows about one order, and the
 * tracking timeline derived from it.
 *
 * There's no per-status history table yet — an `Order` carries only its
 * current `status` (plus `shipmentStatus` for the parcel's leg, which staff
 * move along from the admin Sales Orders page — packages/database/src/
 * shipment.ts), `createdAt`/`updatedAt`, the carrier + tracking number
 * staff enter, and its `Payment`. So the timeline is reconstructed: every
 * step up to the current status is done, the current one is dated by
 * `updatedAt` (the last time the order changed), and only "placed" and
 * "payment received" have exact dates of their own. If an order-event table
 * is added later, `buildTrackingTimeline` is the one place to swap over.
 *
 * Pure data with `type`-only imports, so the dialog (a Client Component)
 * can import it; the page builds `OrderDetail` on the server.
 */

import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus, ShipmentStatus } from "@repo/database";
import type { OrderBillingAddress, OrderShippingAddress } from "./india-address";

export interface OrderDetailItem {
  id: string;
  title: string;
  author: string;
  /** Detail-page path, or null when the product can't be linked to. */
  href: string | null;
  coverImageUrl: string | null;
  fulfillmentType: FulfillmentType;
  /** "Paperback" / "Hardcover" / "E-book", or "Paperback + E-book" for a bundle; null for non-books. */
  formatLabel: string | null;
  includesEbook: boolean;
  quantity: number;
  unitPriceCents: number;
}

/** Serializable (ISO dates) — it crosses from the Server Component to the dialog. */
export interface OrderDetail {
  id: string;
  /** The short "#ab12c" reference shown everywhere a customer sees the order. */
  ref: string;
  status: OrderStatus;
  /** The printed part's progress; null when nothing ships, or before the order is placed. */
  shipmentStatus: ShipmentStatus | null;
  createdAt: string;
  updatedAt: string;
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: OrderShippingAddress | null;
  /** Null on orders placed before checkout asked for one. */
  billingAddress: OrderBillingAddress | null;
  gstNumber: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  payment: {
    method: PaymentMethod | null;
    status: PaymentStatus;
    updatedAt: string;
  } | null;
  items: OrderDetailItem[];
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "ok" | "tile" | "brand" }> = {
  PENDING: { label: "Pending payment", tone: "tile" },
  PAID: { label: "Paid", tone: "brand" },
  PROCESSING: { label: "Processing", tone: "brand" },
  SHIPPED: { label: "Dispatched", tone: "ok" },
  DELIVERED: { label: "Delivered", tone: "ok" },
  READY_FOR_DOWNLOAD: { label: "Ready for download", tone: "ok" },
  CANCELLED: { label: "Cancelled", tone: "tile" },
  REFUNDED: { label: "Refunded", tone: "tile" },
};

type StatusBadge = { label: string; tone: "ok" | "tile" | "brand" };

/** Customer-facing names for the parcel's steps — "approval" is staff talk. */
const SHIPMENT_STATUS: Record<ShipmentStatus, StatusBadge> = {
  AWAITING_APPROVAL: { label: "Awaiting confirmation", tone: "tile" },
  PROCESSING: { label: "Processing", tone: "brand" },
  SHIPPED: { label: "Shipping", tone: "ok" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "ok" },
  DELIVERED: { label: "Delivered", tone: "ok" },
  CANCELLED: { label: "Cancelled", tone: "tile" },
};

/**
 * The one status an order's row and dialog show: the order's own when it's
 * been called off, otherwise the parcel's when there is one (that's what a
 * customer waiting on a delivery wants to know), otherwise the order's.
 */
export function orderStatusBadge(order: Pick<OrderDetail, "status" | "shipmentStatus">): StatusBadge {
  if (order.status === "CANCELLED" || order.status === "REFUNDED" || !order.shipmentStatus) return ORDER_STATUS[order.status];
  return SHIPMENT_STATUS[order.shipmentStatus];
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: "Card",
  UPI: "UPI",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
  OTHER: "Other",
};

export type TrackingStepState = "done" | "current" | "upcoming" | "stopped";

export interface TrackingStep {
  key: string;
  label: string;
  description: string;
  state: TrackingStepState;
  /** ISO timestamp, when one is actually known for this step. */
  at: string | null;
}

/** Ships anything physical? Digital-only and service-only orders have no courier leg. */
export function shipsPhysically(order: Pick<OrderDetail, "items">): boolean {
  return order.items.some((item) => item.fulfillmentType === "SHIP");
}

/**
 * The steps an order goes through for its mix of lines, marked against its
 * current status. `standardEta` is the admin-managed delivery promise
 * ("in 3-5 working days"), shown on the delivery step while it's upcoming.
 */
export function buildTrackingTimeline(order: OrderDetail, standardEta: string): TrackingStep[] {
  const isCod = order.payment?.method === "COD";
  const paidAt = order.payment?.status === "CAPTURED" ? order.payment.updatedAt : null;
  const physical = shipsPhysically(order);
  const servicesOnly = order.items.length > 0 && order.items.every((item) => item.fulfillmentType === "SERVICE");

  const steps: Omit<TrackingStep, "state" | "at">[] = [
    { key: "placed", label: "Order placed", description: `We received order ${order.ref}.` },
    isCod
      ? {
          key: "confirmed",
          label: "Cash on delivery",
          description: "Pay the courier when your parcel arrives.",
        }
      : order.status === "PENDING"
        ? { key: "paid", label: "Awaiting payment", description: "Complete payment to confirm your order." }
        : { key: "paid", label: "Payment received", description: "Your payment was confirmed." },
  ];

  if (physical) {
    const awaiting = order.shipmentStatus === "AWAITING_APPROVAL";
    steps.push(
      {
        key: "accepted",
        label: awaiting ? "Awaiting confirmation" : "Order confirmed",
        description: awaiting ? "We're checking your order and will confirm it shortly." : "We've confirmed your order.",
      },
      { key: "processing", label: "Packing your order", description: "Your items are being picked and packed." },
      {
        key: "shipped",
        label: "Shipping",
        description: order.trackingNumber
          ? `Handed to ${order.carrier || "the courier"} — tracking number ${order.trackingNumber}.`
          : order.status === "DELIVERED" || order.shipmentStatus === "OUT_FOR_DELIVERY" || order.shipmentStatus === "DELIVERED"
            ? "Handed to the courier."
            : "Handed to the courier. Tracking details appear here once added.",
      },
      {
        key: "out_for_delivery",
        label: "Out for delivery",
        description: `Your parcel is on its way to you today.${isCod ? " Keep the cash ready for the courier." : ""}`,
      },
      {
        key: "delivered",
        label: "Delivered",
        description:
          order.status === "DELIVERED" || order.shipmentStatus === "DELIVERED"
            ? "Your parcel was delivered."
            : `Usually arrives ${standardEta} after dispatch.${isCod ? " Pay the courier in cash on delivery." : ""}`,
      }
    );
  } else if (servicesOnly) {
    steps.push(
      { key: "processing", label: "In progress", description: "Our team is working on your service package." },
      { key: "delivered", label: "Completed", description: "Your service package has been delivered." }
    );
  } else {
    steps.push({
      key: "ready",
      label: "Ready for download",
      description: "Your e-books are waiting in your digital library.",
    });
  }

  const keys = steps.map((step) => step.key);
  const reached =
    physical && order.shipmentStatus
      ? shipmentStepKey(order.shipmentStatus, keys)
      : reachedStepKey(order.status, keys, isCod);

  // Cancelled / refunded: we can't tell how far it got before stopping, so
  // only "placed" (and a payment we know was captured) stay ticked, then a
  // terminal step explains what happened. A refused parcel on an order that
  // also held an e-book is this too — only the printed part stopped.
  const parcelOnlyCancelled =
    order.status !== "CANCELLED" && order.status !== "REFUNDED" && order.shipmentStatus === "CANCELLED";
  if (order.status === "CANCELLED" || order.status === "REFUNDED" || parcelOnlyCancelled) {
    const kept: TrackingStep[] = [{ ...steps[0]!, state: "done", at: order.createdAt }];
    if (paidAt) kept.push({ ...steps[1]!, state: "done", at: paidAt });
    kept.push({
      key: order.status === "REFUNDED" ? "refunded" : "cancelled",
      label: order.status === "REFUNDED" ? "Order refunded" : "Order cancelled",
      description:
        order.status === "REFUNDED"
          ? "Your payment has been refunded to the original payment method. Banks usually take 5–7 working days to show it."
          : parcelOnlyCancelled
            ? "We couldn't send the printed items in this order, so they were cancelled and are refunded to your original payment method. Your e-books stay in your digital library."
            : "This order was cancelled. If you paid online, the amount is refunded to your original payment method.",
      state: "stopped",
      at: order.updatedAt,
    });
    return kept;
  }

  const reachedIndex = steps.findIndex((step) => step.key === reached);
  // Reaching the last step means the order is complete, so it's ticked
  // rather than shown as still in progress.
  const complete = reachedIndex === steps.length - 1;
  return steps.map((step, index) => {
    const state: TrackingStepState =
      index < reachedIndex || (index === reachedIndex && complete)
        ? "done"
        : index === reachedIndex
          ? "current"
          : "upcoming";
    let at: string | null = null;
    if (step.key === "placed") at = order.createdAt;
    else if (step.key === "paid" && paidAt) at = paidAt;
    else if (step.key === "confirmed") at = order.createdAt;
    else if (index === reachedIndex) at = order.updatedAt;
    return { ...step, state, at };
  });
}

/** Which step a parcel's shipment status has reached. CANCELLED is handled before this is asked. */
function shipmentStepKey(status: ShipmentStatus, keys: string[]): string {
  const key: Record<ShipmentStatus, string> = {
    AWAITING_APPROVAL: "accepted",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    OUT_FOR_DELIVERY: "out_for_delivery",
    DELIVERED: "delivered",
    CANCELLED: "placed",
  };
  return keys.includes(key[status]) ? key[status] : keys[0]!;
}

/**
 * Which step key the order's current status has reached, among the keys
 * this order has. For a parcel this is only the fallback for an order with
 * no `shipmentStatus` yet (unpaid) or from before it existed —
 * `shipmentStepKey` covers the rest.
 */
function reachedStepKey(status: OrderStatus, keys: string[], isCod: boolean): string {
  const pick = (...candidates: string[]) => candidates.find((key) => keys.includes(key)) ?? keys[0]!;
  switch (status) {
    case "PENDING":
      // Placed, now waiting on the payment step. (A COD order is never
      // PENDING — it's created PROCESSING — but lands on its step the same.)
      return pick(isCod ? "confirmed" : "paid");
    // A paid e-book is already downloadable (lib/library.ts entitles from
    // PAID), so a digital-only order jumps straight to "ready".
    case "PAID":
      return pick("ready", isCod ? "confirmed" : "paid");
    case "PROCESSING":
      return pick("ready", "processing", isCod ? "confirmed" : "paid");
    case "SHIPPED":
      return pick("shipped", "processing");
    case "DELIVERED":
      return pick("delivered", "ready");
    case "READY_FOR_DOWNLOAD":
      return pick("ready", "delivered");
    default:
      return "placed";
  }
}

/**
 * The carrier's own tracking page for a consignment, for the couriers whose
 * tracking URL takes the number directly. Any other carrier gets the number
 * with a copy button instead of a link.
 */
const CARRIER_TRACKING: { match: RegExp; url: (trackingNumber: string) => string }[] = [
  { match: /delhivery/i, url: (n) => `https://www.delhivery.com/track/package/${n}` },
  { match: /shiprocket/i, url: (n) => `https://shiprocket.co/tracking/${n}` },
  { match: /blue\s*dart/i, url: (n) => `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${n}` },
];

export function carrierTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const entry = CARRIER_TRACKING.find((candidate) => candidate.match.test(carrier));
  return entry ? entry.url(encodeURIComponent(trackingNumber.trim())) : null;
}

// Pinned to IST rather than the runtime's zone, so the server render and
// the browser format an order's dates identically (no hydration mismatch)
// and a customer abroad still sees the Press's local dispatch times.
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** "12 Oct 2026" */
export function formatOrderDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "12 Oct 2026, 4:05 pm" */
export function formatOrderDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}
