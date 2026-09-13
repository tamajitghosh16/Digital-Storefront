import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@repo/payments";
import { prisma } from "@repo/database";
import { inngest } from "@repo/jobs";

/**
 * Source of truth for order status (Technical Design Document, Section 3.6).
 * Never trust the client-side redirect after Razorpay Checkout completes —
 * only a signature-verified webhook call marks an order PAID.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const razorpayOrderId = event.payload.payment.entity.order_id;

    const payment = await prisma.payment.findFirst({ where: { gatewayOrderId: razorpayOrderId } });
    if (payment?.orderId) {
      const existing = await prisma.order.findUnique({ where: { id: payment.orderId } });
      // The client-side confirmCheckout may have already flipped this order
      // (both verify Razorpay's signature). Whichever runs first does the
      // fan-out; the other only needs to make sure the row is consistent.
      const alreadyPaid = existing?.status === "PAID";

      const order = await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID" },
        include: { items: { include: { product: true } }, user: true },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CAPTURED", gatewayPaymentId: event.payload.payment.entity.id },
      });

      if (!alreadyPaid) {
        // Digital items → instant entitlement; physical → fulfillment queue;
        // confirmation email → Inngest fan-out (Section 3.8).
        await inngest.send({
          name: "order/confirmed",
          data: {
            orderId: order.id,
            userEmail: order.user?.email ?? order.guestEmail ?? "",
            totalCents: order.totalCents,
            items: order.items.map((i) => ({ title: i.product.title, quantity: i.quantity, priceCents: i.unitPriceCents })),
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
