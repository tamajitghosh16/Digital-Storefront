import Razorpay from "razorpay";
import crypto from "node:crypto";

/**
 * Razorpay adapter — Technical Design Document, Section 3.6 (Checkout & Payment).
 * The webhook, not the client redirect, is the source of truth for order status.
 */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createRazorpayOrder(params: { amountCents: number; currency?: string; receipt: string }) {
  return razorpay.orders.create({
    amount: params.amountCents, // Razorpay expects the smallest currency unit (paise)
    currency: params.currency ?? "INR",
    receipt: params.receipt,
  });
}

/** Verifies the signature Razorpay returns to the client after checkout completes. */
export function verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
}

/** Verifies the `X-Razorpay-Signature` header on incoming webhook requests. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export { razorpay };
