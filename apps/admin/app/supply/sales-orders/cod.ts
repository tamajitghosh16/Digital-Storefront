import type { OrderStatus, PaymentMethod, PaymentStatus, ShipmentStatus } from "@repo/database";

/**
 * Cash on delivery can be marked collected once the parcel has gone out
 * with the courier, and only once. Shared by the page (to show the button)
 * and `markCashCollected` (to refuse anything else).
 */
export function canMarkCashCollected(order: {
  status: OrderStatus;
  shipmentStatus: ShipmentStatus | null;
  payment: { method: PaymentMethod | null; status: PaymentStatus } | null;
}): boolean {
  return (
    order.payment?.method === "COD" &&
    (order.payment.status === "CREATED" || order.payment.status === "AUTHORIZED") &&
    order.status !== "CANCELLED" &&
    order.status !== "REFUNDED" &&
    (order.shipmentStatus === "SHIPPED" || order.shipmentStatus === "OUT_FOR_DELIVERY" || order.shipmentStatus === "DELIVERED")
  );
}

/** Couriers offered as suggestions. The storefront turns Delhivery, Shiprocket and Blue Dart into a tracking link. */
export const SUGGESTED_CARRIERS = ["Delhivery", "Shiprocket", "Blue Dart", "India Post", "DTDC"];
