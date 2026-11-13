"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { hasOnlinePart, nextShipmentStatus, prisma, returnStock, type Prisma, type ShipmentStatus } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, ORDER_WRITE_ROLES } from "@repo/auth/roles";
import { sendOrderShipped } from "@repo/email";
import { stockReturnedTags } from "@repo/cache/tags";
import { revalidateStorefront } from "@/lib/storefront-cache";
import { ORDER_STATS_TAG } from "@/lib/admin-cache";
import { canMarkCashCollected } from "./cod";

const SHIPMENT_STATUSES = [
  "AWAITING_APPROVAL",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly ShipmentStatus[];

const orderIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const moveSchema = z.object({
  orderId: orderIdSchema,
  // What the operator saw on screen. The update only lands while the order
  // is still there, so a double click or two staff on the same order can't
  // skip a step or refuse an order someone else just accepted.
  from: z.enum(SHIPMENT_STATUSES),
  move: z.enum(["accept", "deny", "advance"]),
  // Only for Processing → Shipping, where both are required: they feed the
  // customer's tracking link on My Orders and the "on its way" email.
  carrier: z.string().trim().max(60, "The courier name is too long").optional(),
  trackingNumber: z
    .string()
    .trim()
    .max(60, "The tracking number is too long")
    .regex(/^[A-Za-z0-9-]*$/, "The tracking number can only have letters, numbers and dashes — no spaces")
    .optional(),
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
 *
 * Moving to Shipping needs the courier and tracking number, saved on the
 * order, and emails the customer that the parcel is on its way.
 */
export async function moveSalesOrder(input: z.input<typeof moveSchema>): Promise<MoveSalesOrderResult> {
  const user = await getCurrentStaff();
  assertRole(user?.role, ORDER_WRITE_ROLES);

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) {
    const tracking = parsed.error.issues.find((issue) => issue.path[0] === "carrier" || issue.path[0] === "trackingNumber");
    return { ok: false, error: tracking?.message ?? "That change couldn't be made. Refresh the page and try again." };
  }
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

  const carrier = parsed.data.carrier || null;
  const trackingNumber = parsed.data.trackingNumber || null;
  if (to === "SHIPPED" && (!carrier || !trackingNumber)) {
    return { ok: false, error: "To mark the order as shipping, fill in both the courier and the tracking number." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      guestEmail: true,
      shippingAddress: true,
      user: { select: { email: true } },
      items: {
        select: {
          productId: true,
          bookFormat: true,
          quantity: true,
          fulfillmentType: true,
          includesEbook: true,
          product: { select: { slug: true, productLine: true, type: true } },
        },
      },
    },
  });
  if (!order) return { ok: false, error: "This order no longer exists." };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: "This order has already been cancelled." };
  }

  const cancelWholeOrder = to === "CANCELLED" && !hasOnlinePart(order.items);
  const shippedItems = order.items.filter((item) => item.fulfillmentType === "SHIP");
  const shipped = shippedItems.map(({ productId, bookFormat, quantity }) => ({ productId, bookFormat, quantity }));

  const moved = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, shipmentStatus: from },
      data: {
        shipmentStatus: to,
        ...(cancelWholeOrder && { status: "CANCELLED" }),
        ...(to === "SHIPPED" && { carrier, trackingNumber }),
      },
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
      diff: {
        shipmentStatus: { from, to },
        ...(cancelWholeOrder && { status: { from: order.status, to: "CANCELLED" } }),
        ...(to === "SHIPPED" && { carrier, trackingNumber }),
      },
    },
  });

  if (to === "SHIPPED") {
    const customerEmail = order.user?.email ?? order.guestEmail ?? shippingEmail(order.shippingAddress);
    // After the response, and best-effort like every email here: the order
    // is shipped whether or not the mail goes out, and nothing retries it.
    if (customerEmail) {
      after(async () => {
        try {
          const { error } = await sendOrderShipped({
            to: customerEmail,
            // The same short reference the customer sees on My Orders.
            orderRef: `#${orderId.slice(-5)}`,
            carrier: carrier!,
            trackingNumber: trackingNumber!,
            ordersUrl: storefrontOrdersUrl() ?? undefined,
          });
          if (error) console.error("[sales-orders] could not send the order-shipped email", error);
        } catch (error) {
          console.error("[sales-orders] could not send the order-shipped email", error);
        }
      });
    }
  }

  revalidatePath("/supply/sales-orders");
  revalidatePath("/");
  // The dashboard's cached revenue and order figures.
  revalidateTag(ORDER_STATS_TAG, { expire: 0 });
  // Returned copies change what the storefront shows as in stock.
  if (to === "CANCELLED" && shipped.length) revalidateStorefront(stockReturnedTags(shippedItems.map((item) => item.product)));
  return { ok: true };
}

/**
 * Cash on delivery: the courier has handed over (or remitted) the cash.
 * Sets the order's Payment to CAPTURED, which ticks "Payment received" on
 * the customer's timeline. Online payments never come through here — only
 * apps/web's `settleOrderPayment` marks those paid.
 */
export async function markCashCollected(input: { orderId: string }): Promise<MoveSalesOrderResult> {
  const user = await getCurrentStaff();
  assertRole(user?.role, ORDER_WRITE_ROLES);

  const orderId = orderIdSchema.safeParse(input.orderId);
  if (!orderId.success) return { ok: false, error: "That change couldn't be made. Refresh the page and try again." };

  const order = await prisma.order.findUnique({
    where: { id: orderId.data },
    select: { status: true, shipmentStatus: true, payment: { select: { id: true, method: true, status: true, amountCents: true } } },
  });
  if (!order) return { ok: false, error: "This order no longer exists." };
  const payment = order.payment;
  if (!canMarkCashCollected(order) || !payment) {
    return {
      ok: false,
      error:
        payment?.method === "COD"
          ? "Cash can only be marked collected once the parcel has gone out, and only once."
          : "This order wasn't paid by cash on delivery.",
    };
  }

  const collected = await prisma.payment.updateMany({
    where: { id: payment.id, method: "COD", status: payment.status },
    data: { status: "CAPTURED" },
  });
  if (collected.count !== 1) return { ok: false, error: "Someone else has just updated this order. The list has been refreshed." };

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "sales_order.cod_collected",
      entity: "Order",
      entityId: orderId.data,
      diff: { paymentStatus: { from: payment.status, to: "CAPTURED" }, amountCents: payment.amountCents },
    },
  });

  revalidatePath("/supply/sales-orders");
  revalidatePath("/");
  // The dashboard's cached revenue and order figures.
  revalidateTag(ORDER_STATS_TAG, { expire: 0 });
  return { ok: true };
}

/** The customer's My Orders page on the storefront, for the shipped email's button. */
function storefrontOrdersUrl(): string | null {
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();
  if (!storefrontUrl) return null;
  try {
    return new URL("/account/orders", storefrontUrl).toString();
  } catch {
    return null;
  }
}

/** The email typed at checkout, from the `shippingAddress` snapshot. */
function shippingEmail(address: Prisma.JsonValue): string | null {
  if (address && typeof address === "object" && !Array.isArray(address) && typeof address.email === "string") {
    return address.email;
  }
  return null;
}
