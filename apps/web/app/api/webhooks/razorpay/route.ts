import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@repo/payments";
import { prisma } from "@repo/database";
import { securityEvent } from "@repo/security/log";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import { settleOrderPayment } from "@/lib/orders";

/**
 * Source of truth for order status (Technical Design Document, Section 3.6).
 * Never trust the client-side redirect after Razorpay Checkout completes —
 * only a signature-verified webhook call (or `confirmCheckout`'s equivalent
 * checks) marks an order PAID, via the shared `settleOrderPayment`.
 *
 * Beyond the signature, every captured payment is cross-checked against the
 * Payment row we created at checkout: same gateway order, same amount, same
 * currency. A mismatch is logged and ignored rather than settling the order.
 *
 * Razorpay retries any non-2xx for up to 24h, so only a bad signature or a
 * malformed body gets a 4xx; everything we've handled — including "ignored
 * on purpose" — returns 200.
 */

/** Razorpay webhook bodies are a few KB; refuse anything absurd before hashing it. */
const MAX_BODY_BYTES = 256 * 1024;

type CapturedPaymentEvent = {
  event: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };
    };
  };
};

export async function POST(request: Request) {
  if (!(await rateLimit(RATE_LIMITS.webhook, clientIp(request.headers))).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    securityEvent("webhook.bad_signature", { ip: clientIp(request.headers) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: CapturedPaymentEvent;
  try {
    event = JSON.parse(rawBody) as CapturedPaymentEvent;
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (event.event !== "payment.captured") return NextResponse.json({ received: true });

  const entity = event.payload?.payment?.entity;
  if (!entity?.id || !entity.order_id || typeof entity.amount !== "number") {
    return NextResponse.json({ error: "Malformed payment" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({ where: { gatewayOrderId: entity.order_id } });
  if (!payment?.orderId) {
    // Not one of ours (or a service/project payment handled elsewhere).
    return NextResponse.json({ received: true });
  }

  if (entity.amount !== payment.amountCents || (entity.currency ?? "INR") !== payment.currency) {
    securityEvent("webhook.amount_mismatch", {
      orderId: payment.orderId,
      gatewayPaymentId: entity.id,
      gatewayAmount: entity.amount,
      expectedAmount: payment.amountCents,
      currency: entity.currency ?? null,
    });
    return NextResponse.json({ received: true });
  }

  await settleOrderPayment({
    paymentRowId: payment.id,
    orderId: payment.orderId,
    gatewayPaymentId: entity.id,
    source: "webhook",
  });

  return NextResponse.json({ received: true });
}
