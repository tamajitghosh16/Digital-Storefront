import type { OrderStatus, PaymentMethod, PaymentStatus } from "@repo/database";

/**
 * Which way an order may move, and the words staff see for each step.
 *
 * Shared by the order pages (to offer only the moves that make sense) and
 * the Server Actions (to refuse any other), so the two can't disagree.
 *
 * Fulfilment only goes forward: PAID → PROCESSING → SHIPPED → DELIVERED for
 * anything that ships, PAID → PROCESSING → DELIVERED for e-book and service
 * orders. An order can be cancelled until it's delivered, and refunded once
 * money was actually received. PENDING → PAID is deliberately not here: an
 * online order is only ever marked paid by the verified Razorpay path in
 * apps/web (`settleOrderPayment`), never by hand.
 */

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "READY_FOR_DOWNLOAD",
  "CANCELLED",
  "REFUNDED",
] as const satisfies readonly OrderStatus[];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Waiting for payment",
  PAID: "Paid",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  READY_FOR_DOWNLOAD: "Ready to download",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function orderStatusTone(status: OrderStatus): "on" | "off" | "info" {
  if (status === "DELIVERED" || status === "READY_FOR_DOWNLOAD") return "on";
  if (status === "PAID" || status === "PROCESSING" || status === "SHIPPED") return "info";
  return "off";
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: "Card",
  UPI: "UPI",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
  OTHER: "Other",
};

export function paymentStatusLabel(status: PaymentStatus, method: PaymentMethod | null): string {
  switch (status) {
    case "CREATED":
      return method === "COD" ? "Cash not collected yet" : "Not paid yet";
    case "AUTHORIZED":
      return "Approved, not yet received";
    case "CAPTURED":
      return "Received";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
  }
}

export interface OrderShape {
  status: OrderStatus;
  /** Has at least one line the courier delivers. */
  ships: boolean;
  /** Money for this order has actually been received (online, or COD cash marked collected). */
  paymentReceived: boolean;
}

const CANCELLABLE: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED"];

/** The statuses staff may move this order to from where it is now. */
export function nextStatuses(order: OrderShape): OrderStatus[] {
  const forward: Partial<Record<OrderStatus, OrderStatus[]>> = order.ships
    ? { PAID: ["PROCESSING", "SHIPPED"], PROCESSING: ["SHIPPED"], SHIPPED: ["DELIVERED"] }
    : { PAID: ["PROCESSING", "DELIVERED"], PROCESSING: ["DELIVERED"] };

  const next = [...(forward[order.status] ?? [])];
  if (CANCELLABLE.includes(order.status)) next.push("CANCELLED");
  if (order.paymentReceived && order.status !== "PENDING" && order.status !== "REFUNDED") next.push("REFUNDED");
  return next;
}

/** The line under each choice on the order page, saying what it means for the customer. */
export function nextStatusHelp(status: OrderStatus, ships: boolean): string {
  switch (status) {
    case "PROCESSING":
      return ships
        ? "You've started packing it. The customer sees “Packing your order”."
        : "You've started work on it. The customer sees “In progress”.";
    case "SHIPPED":
      return "Handed to the courier. Fill in the courier and tracking number below — the customer gets a tracking link.";
    case "DELIVERED":
      return ships ? "The parcel has reached the customer." : "Everything has been handed over to the customer.";
    case "CANCELLED":
      return "It won't be sent. If they paid online, refund them in Razorpay, then come back and mark the order Refunded.";
    case "REFUNDED":
      return "You've already given their money back (in Razorpay, or in cash). Choosing this doesn't send the refund for you.";
    default:
      return "";
  }
}

/** Cash can only be in hand once the parcel has gone out with the courier. */
export function canMarkCashCollected(order: {
  status: OrderStatus;
  payment: { method: PaymentMethod | null; status: PaymentStatus } | null;
}): boolean {
  return (
    order.payment?.method === "COD" &&
    (order.payment.status === "CREATED" || order.payment.status === "AUTHORIZED") &&
    (order.status === "SHIPPED" || order.status === "DELIVERED")
  );
}

/** The customer-facing reference — the same "#ab12c" the storefront shows, so a customer can quote it. */
export function orderRef(id: string): string {
  return `#${id.slice(-5)}`;
}

/** Couriers offered as suggestions. The storefront turns the first three into a clickable tracking link. */
export const SUGGESTED_CARRIERS = ["Delhivery", "Shiprocket", "Blue Dart", "India Post", "DTDC"];
