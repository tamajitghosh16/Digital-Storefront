/**
 * The sales-order lifecycle both apps agree on: which part of an order is
 * "online" (delivered the moment it's paid — an e-book) and which is
 * "offline" (a parcel staff must approve, pack and send), and the steps the
 * offline part goes through, kept in `Order.shipmentStatus`.
 *
 *   AWAITING_APPROVAL → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
 *          └──────────→ CANCELLED (staff refused the order)
 *
 * apps/admin moves an order along these steps; apps/web shows the customer
 * where it is. Pure data with `type`-only imports, so Client Components in
 * either app can use it — import it from `@repo/database/shipment` there.
 */

import type { FulfillmentType, ShipmentStatus } from "@prisma/client";

/** The happy path, in order. CANCELLED is a dead end off the first step. */
export const SHIPMENT_STEPS = [
  "AWAITING_APPROVAL",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const satisfies readonly ShipmentStatus[];

/** Staff-facing names, as the Sales Orders page shows them. */
export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  AWAITING_APPROVAL: "Awaiting approval",
  PROCESSING: "Processing",
  SHIPPED: "Shipping",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/**
 * The step after `status` once staff move it on, or null at the end of the
 * line (DELIVERED, CANCELLED). Leaving AWAITING_APPROVAL is "Accept".
 */
export function nextShipmentStatus(status: ShipmentStatus): ShipmentStatus | null {
  const index = (SHIPMENT_STEPS as readonly ShipmentStatus[]).indexOf(status);
  return index === -1 ? null : (SHIPMENT_STEPS[index + 1] ?? null);
}

type Line = { fulfillmentType: FulfillmentType; includesEbook: boolean };

/** Something to pack and post. */
export function hasOfflinePart(items: Line[]): boolean {
  return items.some((item) => item.fulfillmentType === "SHIP");
}

/**
 * Something delivered without a courier: an e-book (on its own, or bundled
 * with a printed copy) or a service package.
 */
export function hasOnlinePart(items: Line[]): boolean {
  return items.some((item) => item.fulfillmentType !== "SHIP" || item.includesEbook);
}

export type DeliveryType = "ONLINE" | "OFFLINE" | "MIXED";

export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  MIXED: "Online + Offline",
};

export function deliveryType(items: Line[]): DeliveryType {
  const offline = hasOfflinePart(items);
  if (!offline) return "ONLINE";
  return hasOnlinePart(items) ? "MIXED" : "OFFLINE";
}
