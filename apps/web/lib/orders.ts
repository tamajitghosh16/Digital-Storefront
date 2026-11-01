import "server-only";
import { Prisma, bookFormatLabel, prisma } from "@repo/database";
import { sendOrderConfirmation } from "@repo/email";
import { securityEvent } from "@repo/security/log";

/**
 * The one place an order moves PENDING → PAID. Shared by the Razorpay
 * webhook (authoritative) and `confirmCheckout` (the early, client-triggered
 * path), so both apply exactly the same rules:
 *
 *  - The transition is a conditional `updateMany({ status: "PENDING" })`, so
 *    whichever path runs second is a no-op and the confirmation email is
 *    sent exactly once, even when both race.
 *  - `Payment.gatewayPaymentId` is unique, so one Razorpay payment can never
 *    settle two orders (the replay attack in docs/security-roadmap.md C2).
 *  - A payment captured against an order that is no longer PENDING (e.g.
 *    CANCELLED) is recorded but does not resurrect the order — it's flagged
 *    for a manual refund instead.
 *
 * Callers must already have proven the payment is genuine *and* belongs to
 * this Payment row (signature + gateway order id + amount).
 */
export type SettleOutcome = "settled" | "already_paid" | "not_pending" | "payment_reused";

export async function settleOrderPayment(params: {
  paymentRowId: string;
  orderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  source: "webhook" | "checkout";
}): Promise<SettleOutcome> {
  let transitioned = false;

  try {
    transitioned = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: params.paymentRowId },
        data: {
          status: "CAPTURED",
          gatewayPaymentId: params.gatewayPaymentId,
          ...(params.gatewaySignature ? { gatewaySignature: params.gatewaySignature } : {}),
        },
      });
      const { count } = await tx.order.updateMany({
        where: { id: params.orderId, status: "PENDING" },
        data: { status: "PAID" },
      });
      // Paid is when the order counts as placed: anything printed in it now
      // waits for staff to accept it on the admin Sales Orders page.
      if (count === 1) {
        await tx.order.updateMany({
          where: { id: params.orderId, shipmentStatus: null, items: { some: { fulfillmentType: "SHIP" } } },
          data: { shipmentStatus: "AWAITING_APPROVAL" },
        });
      }
      return count === 1;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      securityEvent("checkout.payment_mismatch", {
        reason: "gateway payment already used by another order",
        orderId: params.orderId,
        gatewayPaymentId: params.gatewayPaymentId,
        source: params.source,
      });
      return "payment_reused";
    }
    throw error;
  }

  if (!transitioned) {
    const order = await prisma.order.findUnique({ where: { id: params.orderId }, select: { status: true } });
    if (order?.status === "PAID") return "already_paid";
    securityEvent("webhook.paid_after_cancel", {
      orderId: params.orderId,
      status: order?.status ?? null,
      gatewayPaymentId: params.gatewayPaymentId,
      source: params.source,
      action: "refund manually",
    });
    return "not_pending";
  }

  await sendOrderConfirmationEmail(params.orderId);
  return "settled";
}

/**
 * Emails the order confirmation. Never throws: by the time this runs the
 * order already stands, and a mail-provider failure mustn't undo it or make
 * the Razorpay webhook fail and retry. There is no automatic retry — a
 * failure is only logged.
 */
export async function sendOrderConfirmationEmail(orderId: string, userEmail?: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    });
    const to = userEmail || order.user?.email || order.guestEmail;
    if (!to) return;
    await sendOrderConfirmation({
      to,
      orderId: order.id,
      totalCents: order.totalCents,
      items: order.items.map((item) => ({
        title: item.bookFormat ? `${item.product.title} (${bookFormatLabel(item.bookFormat)})` : item.product.title,
        quantity: item.quantity,
        priceCents: item.unitPriceCents,
      })),
    });
  } catch (error) {
    console.error("[orders] could not send the order confirmation email", error);
  }
}
