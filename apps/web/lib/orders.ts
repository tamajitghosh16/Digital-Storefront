import "server-only";
import { Prisma, bookFormatLabel, prisma } from "@repo/database";
import { inngest } from "@repo/jobs";
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

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: params.orderId },
    include: { items: { include: { product: true } }, user: true },
  });
  await inngest.send({
    name: "order/confirmed",
    data: {
      orderId: order.id,
      userEmail: order.user?.email ?? order.guestEmail ?? "",
      totalCents: order.totalCents,
      items: order.items.map((item) => ({
        title: item.bookFormat ? `${item.product.title} (${bookFormatLabel(item.bookFormat)})` : item.product.title,
        quantity: item.quantity,
        priceCents: item.unitPriceCents,
      })),
    },
  });
  return "settled";
}
