import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidPaymentSignature, isValidWebhookSignature } from "./signature";

const secret = "test_secret";
const sign = (payload: string, key = secret) => crypto.createHmac("sha256", key).update(payload).digest("hex");

describe("isValidPaymentSignature", () => {
  it("accepts Razorpay's order_id|payment_id HMAC", () => {
    const signature = sign("order_A|pay_A");
    expect(isValidPaymentSignature({ orderId: "order_A", paymentId: "pay_A", signature, secret })).toBe(true);
  });

  it("rejects a signature for a different order (replay)", () => {
    const signature = sign("order_A|pay_A");
    expect(isValidPaymentSignature({ orderId: "order_B", paymentId: "pay_A", signature, secret })).toBe(false);
  });

  it("fails closed without a secret, and on malformed signatures instead of throwing", () => {
    const signature = sign("order_A|pay_A");
    expect(isValidPaymentSignature({ orderId: "order_A", paymentId: "pay_A", signature, secret: undefined })).toBe(false);
    expect(isValidPaymentSignature({ orderId: "order_A", paymentId: "pay_A", signature: "abc", secret })).toBe(false);
    expect(isValidPaymentSignature({ orderId: "order_A", paymentId: "pay_A", signature: "zz", secret })).toBe(false);
    expect(isValidPaymentSignature({ orderId: "order_A", paymentId: "pay_A", signature: "", secret })).toBe(false);
  });
});

describe("isValidWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured" });

  it("accepts a correct signature", () => {
    expect(isValidWebhookSignature({ rawBody: body, signature: sign(body), secret })).toBe(true);
  });

  it("rejects a tampered body, a wrong key, and a short signature without throwing", () => {
    expect(isValidWebhookSignature({ rawBody: body + " ", signature: sign(body), secret })).toBe(false);
    expect(isValidWebhookSignature({ rawBody: body, signature: sign(body, "other"), secret })).toBe(false);
    expect(isValidWebhookSignature({ rawBody: body, signature: "deadbeef", secret })).toBe(false);
    expect(isValidWebhookSignature({ rawBody: body, signature: sign(body), secret: "" })).toBe(false);
  });
});
