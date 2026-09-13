"use server";

import { getCurrentUser } from "@repo/auth/server";
import { getPricingConfig, prisma, type FulfillmentType } from "@repo/database";
import { createRazorpayOrder, verifyPaymentSignature } from "@repo/payments";
import { inngest } from "@repo/jobs";
import {
  deliveryFeeCents,
  includedGstCents,
  lookupDiscount,
  tierForQuantity,
  tierUnitCents,
  type DeliverySpeed,
  type TaxableType,
} from "@/lib/pricing";

/**
 * Checkout: turn the client cart into a real Order + Payment and hand back
 * what the browser needs to open Razorpay Checkout, then verify the result.
 *
 * The Razorpay webhook (app/api/webhooks/razorpay/route.ts) remains the
 * authoritative, idempotent source of order status. `confirmCheckout` only
 * flips PENDING → PAID early so the shopper can be redirected to their
 * library without waiting for the webhook round-trip; it is a no-op if the
 * webhook already won the race.
 *
 * Line prices are always re-derived here from `Product` — the client's
 * `priceCents` is never trusted.
 */

interface CheckoutInput {
  items: { productId: string; quantity: number }[];
  contact: { name: string; email: string; address: string; city: string; state: string; pin: string; gst?: string };
  speed: DeliverySpeed;
  couponCode?: string;
}

type StartResult =
  | {
      ok: true;
      orderId: string;
      razorpayOrderId: string;
      amountCents: number;
      keyId: string;
      currency: string;
      redirect: string;
    }
  | { ok: false; error: "SIGN_IN_REQUIRED" | "NOT_CONFIGURED" | "EMPTY_CART" | "PRODUCT_MISSING" | "GATEWAY_ERROR" };

/** `"<id>:ebook"` / `"<id>:both"` (from buy-box) → the real Product id + edition tag. */
function splitLineId(raw: string): { productId: string; edition: "print" | "ebook" | "both" } {
  const parts = raw.split(":");
  const tag = parts[1];
  return { productId: parts[0] ?? "", edition: tag === "ebook" ? "ebook" : tag === "both" ? "both" : "print" };
}

export async function startCheckout(input: CheckoutInput): Promise<StartResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const lines = input.items
    .map((item) => ({ ...splitLineId(item.productId), quantity: Math.max(1, Math.round(item.quantity)) }))
    .filter((line) => line.productId);
  if (lines.length === 0) return { ok: false, error: "EMPTY_CART" };

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(lines.map((line) => line.productId))] } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  if (lines.some((line) => !byId.has(line.productId))) return { ok: false, error: "PRODUCT_MISSING" };

  const pricing = await getPricingConfig();

  const orderItems = lines.map((line) => {
    const product = byId.get(line.productId)!;
    const tier = tierForQuantity(pricing.classSetTiers, line.quantity);
    const printUnit = tierUnitCents(product.priceCents, tier.discount);

    let unitPriceCents: number;
    let fulfillmentType: FulfillmentType;
    let taxType: TaxableType;

    if (line.edition === "ebook") {
      unitPriceCents = product.ebookPriceCents ?? product.priceCents;
      fulfillmentType = "DIGITAL";
      taxType = "EBOOK";
    } else if (line.edition === "both") {
      unitPriceCents = printUnit + pricing.bundleEbookAddCents;
      fulfillmentType = "SHIP";
      taxType = "PHYSICAL_BOOK";
    } else if (product.type === "SERVICE_PACKAGE") {
      unitPriceCents = product.priceCents;
      fulfillmentType = "SERVICE";
      taxType = "SERVICE_PACKAGE";
    } else if (product.type === "EBOOK") {
      unitPriceCents = product.priceCents;
      fulfillmentType = "DIGITAL";
      taxType = "EBOOK";
    } else {
      unitPriceCents = printUnit;
      fulfillmentType = "SHIP";
      taxType = "PHYSICAL_BOOK";
    }

    return { productId: line.productId, quantity: line.quantity, unitPriceCents, fulfillmentType, taxType };
  });

  const subtotalCents = orderItems.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const discountCents = input.couponCode
    ? Math.round(subtotalCents * (lookupDiscount(pricing, input.couponCode)?.rate ?? 0))
    : 0;
  const shippingCents = deliveryFeeCents(pricing, subtotalCents, input.speed);
  const taxCents = orderItems.reduce(
    (sum, line) => sum + includedGstCents(line.unitPriceCents * line.quantity, line.taxType, pricing.gstRates),
    0
  );
  const totalCents = subtotalCents - discountCents + shippingCents;

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: "PENDING",
      subtotalCents,
      taxCents,
      shippingCents,
      totalCents,
      items: {
        create: orderItems.map(({ taxType: _taxType, ...line }) => line),
      },
    },
    include: { items: true },
  });

  let razorpayOrderId: string;
  let razorpayAmount: number;
  try {
    const rp = await createRazorpayOrder({ amountCents: totalCents, receipt: order.id });
    razorpayOrderId = rp.id;
    razorpayAmount = typeof rp.amount === "number" ? rp.amount : totalCents;
  } catch (error) {
    console.error("[checkout] createRazorpayOrder failed", error);
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return { ok: false, error: "GATEWAY_ERROR" };
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      gatewayOrderId: razorpayOrderId,
      amountCents: totalCents,
      currency: "INR",
      status: "CREATED",
    },
  });

  const hasDigital = order.items.some((item) => item.fulfillmentType === "DIGITAL");

  return {
    ok: true,
    orderId: order.id,
    razorpayOrderId,
    amountCents: razorpayAmount,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    currency: "INR",
    redirect: hasDigital ? "/account/library" : "/account/orders",
  };
}

interface ConfirmInput {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

type ConfirmResult = { ok: true; redirect: string } | { ok: false; error: string };

export async function confirmCheckout(input: ConfirmInput): Promise<ConfirmResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const signatureValid = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });
  if (!signatureValid) return { ok: false, error: "BAD_SIGNATURE" };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: { include: { product: true } }, payment: true, user: true },
  });
  if (!order || order.userId !== user.id) return { ok: false, error: "NOT_FOUND" };

  const redirect = order.items.some((item) => item.fulfillmentType === "DIGITAL")
    ? "/account/library"
    : "/account/orders";

  // Idempotent: the webhook may already have flipped this. Only do the work
  // (and fire the confirmation email) once.
  if (order.status !== "PAID") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "CAPTURED",
          gatewayPaymentId: input.razorpayPaymentId,
          gatewaySignature: input.razorpaySignature,
        },
      });
    }
    await inngest.send({
      name: "order/confirmed",
      data: {
        orderId: order.id,
        userEmail: order.user?.email ?? order.guestEmail ?? "",
        totalCents: order.totalCents,
        items: order.items.map((item) => ({
          title: item.product.title,
          quantity: item.quantity,
          priceCents: item.unitPriceCents,
        })),
      },
    });
  }

  return { ok: true, redirect };
}
