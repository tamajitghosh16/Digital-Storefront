import "server-only";
import Razorpay from "razorpay";
import { isValidPaymentSignature, isValidWebhookSignature } from "./signature";

/**
 * Razorpay adapter — Technical Design Document, Section 3.6 (Checkout & Payment).
 * The webhook, not the client redirect, is the source of truth for order status.
 */
// Built lazily, not at module load — this module is also imported just for
// verifyWebhookSignature() (e.g. the webhook route), and Next.js imports
// route modules during the build's "collect page data" step. Constructing
// the SDK eagerly meant any build without RAZORPAY_KEY_ID/SECRET set would
// fail even for routes that never touch the client.
let razorpay: Razorpay | undefined;
function getRazorpayClient(): Razorpay {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return razorpay;
}

export async function createRazorpayOrder(params: { amountCents: number; currency?: string; receipt: string }) {
  return getRazorpayClient().orders.create({
    amount: params.amountCents, // Razorpay expects the smallest currency unit (paise)
    currency: params.currency ?? "INR",
    receipt: params.receipt,
  });
}

/**
 * Verifies the signature Razorpay returns to the client after checkout
 * completes. This only proves *some* payment for `orderId` happened — the
 * caller must still check that `orderId` is the gateway order it created for
 * the order being confirmed (see apps/web's confirmCheckout).
 */
export function verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
  return isValidPaymentSignature({ ...params, secret: process.env.RAZORPAY_KEY_SECRET });
}

/** Verifies the `X-Razorpay-Signature` header on incoming webhook requests. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return isValidWebhookSignature({ rawBody, signature, secret: process.env.RAZORPAY_WEBHOOK_SECRET });
}

export interface GatewayPayment {
  id: string;
  orderId: string | null;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Fetches a payment from Razorpay's API — the authoritative record of what
 * was actually charged, for the order it was charged against. Used to
 * cross-check the client's claim before marking an order paid.
 */
export async function fetchGatewayPayment(paymentId: string): Promise<GatewayPayment> {
  const payment = await getRazorpayClient().payments.fetch(paymentId);
  return {
    id: String(payment.id),
    orderId: payment.order_id ? String(payment.order_id) : null,
    amount: Number(payment.amount),
    currency: String(payment.currency),
    status: String(payment.status),
  };
}

export { getRazorpayClient };
