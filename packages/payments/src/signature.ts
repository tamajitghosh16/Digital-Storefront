import crypto from "node:crypto";

/**
 * Razorpay HMAC checks, as pure functions of (payload, signature, secret) so
 * they can be unit-tested without env vars or the SDK.
 *
 * Every function fails closed: a missing secret, a missing/oddly-sized
 * signature, or non-hex input returns `false` rather than throwing (Node's
 * `timingSafeEqual` throws on a length mismatch, which used to turn a junk
 * webhook into a 500).
 */

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqualHex(expectedHex: string, receivedHex: string): boolean {
  if (typeof receivedHex !== "string" || !/^[0-9a-f]+$/i.test(receivedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length === 0 || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

/** The `razorpay_signature` Checkout returns: HMAC(key_secret, `${order_id}|${payment_id}`). */
export function isValidPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string | undefined;
}): boolean {
  if (!params.secret || !params.orderId || !params.paymentId || !params.signature) return false;
  return safeEqualHex(hmacHex(params.secret, `${params.orderId}|${params.paymentId}`), params.signature);
}

/** The `X-Razorpay-Signature` webhook header: HMAC(webhook_secret, raw body). */
export function isValidWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secret: string | undefined;
}): boolean {
  if (!params.secret || !params.signature) return false;
  return safeEqualHex(hmacHex(params.secret, params.rawBody), params.signature);
}
