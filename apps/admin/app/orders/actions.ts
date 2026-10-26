"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma, type OrderStatus, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, ORDER_WRITE_ROLES } from "@repo/auth/roles";
import { inngest } from "@repo/jobs";
import { ORDER_STATUS_LABEL, canMarkCashCollected, nextStatuses } from "./order-status";
import { orderUpdateFormSchema } from "./schema";

// Moving an order along its fulfilment path, and recording COD cash as
// collected. This is what drives the tracking timeline customers see on the
// storefront's My Orders page (apps/web/lib/order-tracking.ts reads
// `status`, `updatedAt`, `carrier`/`trackingNumber` and `Payment.status`).
//
// Neither action can mark an online order paid: PENDING → PAID belongs to
// apps/web's signature-verified `settleOrderPayment` alone, and
// `nextStatuses` never offers it. COD collection is a separate, staff-only
// fact about cash in hand, so it lives here.

/** `never` so TypeScript narrows a failed check away at the call site. */
function back(orderId: string, params: string): never {
  redirect(`/orders/${orderId}?${params}`);
}

function fail(orderId: string, message: string): never {
  back(orderId, `error=${encodeURIComponent(message)}`);
}

async function requireOrderWriter() {
  const staff = await getCurrentStaff();
  assertRole(staff?.role, ORDER_WRITE_ROLES);
  return staff!;
}

/** Thrown inside a transaction when the order moved on since the page was rendered. */
class OrderChangedError extends Error {}

const CHANGED_MESSAGE =
  "Someone else updated this order while you had it open. Check what it says now and try again.";

export async function updateOrder(orderId: string, formData: FormData) {
  const staff = await requireOrderWriter();

  const parsed = orderUpdateFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail(orderId, parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      items: { select: { fulfillmentType: true } },
      user: { select: { email: true } },
    },
  });
  if (!order) fail(orderId, "This order no longer exists.");
  if (order.status !== input.expectedStatus) fail(orderId, CHANGED_MESSAGE);

  const ships = order.items.some((item) => item.fulfillmentType === "SHIP");
  const targetStatus: OrderStatus = input.status ?? order.status;
  const statusChanged = targetStatus !== order.status;
  if (
    statusChanged &&
    !nextStatuses({ status: order.status, ships, paymentReceived: order.payment?.status === "CAPTURED" }).includes(
      targetStatus
    )
  ) {
    fail(
      orderId,
      `An order that's ${ORDER_STATUS_LABEL[order.status].toLowerCase()} can't be marked ${ORDER_STATUS_LABEL[targetStatus].toLowerCase()}.`
    );
  }

  // Only parcels have a courier; for anything else the tracking fields aren't shown and are left alone.
  const carrier = ships ? (input.carrier ?? null) : order.carrier;
  const trackingNumber = ships ? (input.trackingNumber ?? null) : order.trackingNumber;
  if (targetStatus === "SHIPPED" && (!carrier || !trackingNumber)) {
    fail(orderId, "To mark the order shipped, fill in both the courier and the tracking number.");
  }

  const diff: Record<string, { from: string | null; to: string | null }> = {};
  if (statusChanged) diff.status = { from: order.status, to: targetStatus };
  if (carrier !== order.carrier) diff.carrier = { from: order.carrier, to: carrier };
  if (trackingNumber !== order.trackingNumber) diff.trackingNumber = { from: order.trackingNumber, to: trackingNumber };
  if (Object.keys(diff).length === 0) back(orderId, `saved=${encodeURIComponent("Nothing to change — the order is as it was.")}`);

  // Refunding money that was received closes out the payment too, so the
  // storefront's timeline and the dashboard's revenue agree with the order.
  const refundPayment = targetStatus === "REFUNDED" && statusChanged && order.payment?.status === "CAPTURED";
  if (refundPayment) diff.paymentStatus = { from: "CAPTURED", to: "REFUNDED" };

  try {
    await prisma.$transaction(async (tx) => {
      // Conditional on the status we read, so two people saving at once
      // can't both move it.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: targetStatus, carrier, trackingNumber },
      });
      if (count !== 1) throw new OrderChangedError();
      if (refundPayment) {
        await tx.payment.update({ where: { id: order.payment!.id }, data: { status: "REFUNDED" } });
      }
      await tx.auditLog.create({
        data: {
          actorId: staff.id,
          actorEmail: staff.email,
          action: statusChanged ? "order.status_changed" : "order.tracking_updated",
          entity: "Order",
          entityId: orderId,
          diff: diff as Prisma.InputJsonValue,
        },
      });
    });
  } catch (error) {
    if (error instanceof OrderChangedError) fail(orderId, CHANGED_MESSAGE);
    throw error;
  }

  if (statusChanged && targetStatus === "SHIPPED") {
    const userEmail = order.user?.email ?? order.guestEmail ?? shippingEmail(order.shippingAddress);
    // After the response, and best-effort: with no Inngest key configured a
    // send retries for several seconds, and the order is shipped either way.
    after(async () => {
      try {
        await inngest.send({
          name: "order/shipped",
          data: { orderId, userEmail: userEmail ?? "", trackingNumber: trackingNumber! },
        });
      } catch (error) {
        console.error("[orders] could not queue the order-shipped event", error);
      }
    });
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  back(
    orderId,
    `saved=${encodeURIComponent(
      statusChanged ? `Order marked ${ORDER_STATUS_LABEL[targetStatus].toLowerCase()}.` : "Tracking details saved."
    )}`
  );
}

/**
 * Cash on delivery: the courier has handed over (or remitted) the cash.
 * Sets the order's Payment to CAPTURED, which ticks "Payment received" on
 * the customer's timeline. Online payments never come through here.
 */
export async function markCashCollected(orderId: string) {
  const staff = await requireOrderWriter();

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) fail(orderId, "This order no longer exists.");
  if (!canMarkCashCollected(order)) {
    fail(
      orderId,
      order.payment?.method === "COD"
        ? "Cash can only be marked collected once the order has been shipped, and only once."
        : "This order wasn't paid by cash on delivery."
    );
  }
  const payment = order.payment!;

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, method: "COD", status: payment.status },
        data: { status: "CAPTURED" },
      });
      if (count !== 1) throw new OrderChangedError();
      await tx.auditLog.create({
        data: {
          actorId: staff.id,
          actorEmail: staff.email,
          action: "order.cod_collected",
          entity: "Order",
          entityId: orderId,
          diff: { paymentStatus: { from: payment.status, to: "CAPTURED" }, amountCents: payment.amountCents },
        },
      });
    });
  } catch (error) {
    if (error instanceof OrderChangedError) fail(orderId, CHANGED_MESSAGE);
    throw error;
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  back(orderId, `saved=${encodeURIComponent("Cash marked as collected.")}`);
}

/** The email typed at checkout, from the `shippingAddress` snapshot. */
function shippingEmail(address: Prisma.JsonValue): string | null {
  if (address && typeof address === "object" && !Array.isArray(address) && typeof address.email === "string") {
    return address.email;
  }
  return null;
}
