"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasOnlinePart, nextShipmentStatus, prisma, returnStock, type ShipmentStatus } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, ORDER_WRITE_ROLES } from "@repo/auth/roles";
import { revalidateStorefront } from "@/lib/storefront-cache";

const SHIPMENT_STATUSES = [
  "AWAITING_APPROVAL",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly ShipmentStatus[];

const moveSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  // What the operator saw on screen. The update only lands while the order
  // is still there, so a double click or two staff on the same order can't
  // skip a step or refuse an order someone else just accepted.
  from: z.enum(SHIPMENT_STATUSES),
  move: z.enum(["accept", "deny", "advance"]),
});

export type MoveSalesOrderResult = { ok: true } | { ok: false; error: string };

/**
 * Moves the printed part of a sales order one step: Accept or Deny a new
 * order, then Processing → Shipping → Out for delivery → Delivered.
 *
 * Deny returns the order's printed copies to stock. If nothing in the order
 * was delivered online, the whole order is cancelled (`status` CANCELLED);
 * if it also held an e-book, only the parcel is — the e-book stays in the
 * customer's library. A refund of an online payment is still made by hand
 * from the Razorpay dashboard; the Sales Orders dialog says so.
 */
export async function moveSalesOrder(input: z.input<typeof moveSchema>): Promise<MoveSalesOrderResult> {
  const user = await getCurrentStaff();
  assertRole(user?.role, ORDER_WRITE_ROLES);

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That change couldn't be made. Refresh the page and try again." };
  const { orderId, from, move } = parsed.data;

  const to: ShipmentStatus | null =
    move === "deny"
      ? from === "AWAITING_APPROVAL"
        ? "CANCELLED"
        : null
      : move === "accept"
        ? from === "AWAITING_APPROVAL"
          ? "PROCESSING"
          : null
        : from === "AWAITING_APPROVAL"
          ? null
          : nextShipmentStatus(from);
  if (!to) return { ok: false, error: "That step isn't available for this order." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      items: { select: { productId: true, bookFormat: true, quantity: true, fulfillmentType: true, includesEbook: true } },
    },
  });
  if (!order) return { ok: false, error: "This order no longer exists." };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: "This order has already been cancelled." };
  }

  const cancelWholeOrder = to === "CANCELLED" && !hasOnlinePart(order.items);
  const shipped = order.items
    .filter((item) => item.fulfillmentType === "SHIP")
    .map(({ productId, bookFormat, quantity }) => ({ productId, bookFormat, quantity }));

  const moved = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, shipmentStatus: from },
      data: { shipmentStatus: to, ...(cancelWholeOrder && { status: "CANCELLED" }) },
    });
    // Checkout took these copies off the shelf; a refused parcel puts them
    // back. (An item staff only started counting after the order was placed
    // gains copies it never lost — the same trade-off checkout makes.)
    if (count === 1 && to === "CANCELLED") await returnStock(tx, shipped);
    return count === 1;
  });
  if (!moved) return { ok: false, error: "Someone else has just updated this order. The list has been refreshed." };

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: move === "advance" ? "sales_order.status_changed" : `sales_order.${move === "accept" ? "accepted" : "denied"}`,
      entity: "Order",
      entityId: orderId,
      diff: { shipmentStatus: { from, to }, ...(cancelWholeOrder && { status: { from: order.status, to: "CANCELLED" } }) },
    },
  });

  revalidatePath("/supply/sales-orders");
  revalidatePath("/");
  // Returned copies change what the storefront shows as in stock.
  if (to === "CANCELLED" && shipped.length) revalidateStorefront();
  return { ok: true };
}
