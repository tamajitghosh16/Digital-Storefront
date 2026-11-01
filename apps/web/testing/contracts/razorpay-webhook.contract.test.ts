import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract with Razorpay, the provider of webhook calls: their documented
// `payment.captured` payload (razorpay/payment.captured.json, the shape of
// Razorpay's docs) and signature scheme (hex HMAC-SHA256 of the raw body
// with the webhook secret, in `X-Razorpay-Signature`). If Razorpay's format
// or our parsing drifts apart, this fails before a real payment does.

const SECRET = "contract-webhook-secret";
const fixture = readFileSync(new URL("./razorpay/payment.captured.json", import.meta.url), "utf8");
const captured = JSON.parse(fixture);

const findFirst = vi.hoisted(() => vi.fn());
const settle = vi.hoisted(() => vi.fn());
vi.mock("@repo/database", () => ({ prisma: { payment: { findFirst } } }));
vi.mock("@/lib/orders", () => ({ settleOrderPayment: settle }));

const { POST } = await import("@/app/api/webhooks/razorpay/route");

const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

function delivery(body: string, signature = sign(body)) {
  return new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", "x-razorpay-signature": signature },
  });
}

describe("Razorpay webhook contract", () => {
  beforeEach(() => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", SECRET);
    findFirst.mockReset();
    settle.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("settles the order a documented payment.captured event refers to", async () => {
    const entity = captured.payload.payment.entity;
    findFirst.mockResolvedValue({ id: "payrow_1", orderId: "ord_1", amountCents: entity.amount, currency: "INR" });

    const response = await POST(delivery(fixture));

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({ where: { gatewayOrderId: entity.order_id } });
    expect(settle).toHaveBeenCalledWith({
      paymentRowId: "payrow_1",
      orderId: "ord_1",
      gatewayPaymentId: entity.id,
      source: "webhook",
    });
  });

  it("ignores a capture whose amount doesn't match what we charged", async () => {
    findFirst.mockResolvedValue({ id: "payrow_1", orderId: "ord_1", amountCents: 100, currency: "INR" });

    const response = await POST(delivery(fixture));

    expect(response.status).toBe(200);
    expect(settle).not.toHaveBeenCalled();
  });

  it.each(["payment.failed", "payment.authorized", "order.paid", "refund.processed"])(
    "acknowledges %s with a 2xx, so Razorpay doesn't retry it for 24h",
    async (event) => {
      const body = JSON.stringify({ ...captured, event });

      const response = await POST(delivery(body));

      expect(response.status).toBe(200);
      expect(settle).not.toHaveBeenCalled();
    }
  );

  it("rejects a delivery signed with anything but the webhook secret", async () => {
    const forged = createHmac("sha256", "someone-else").update(fixture).digest("hex");

    const response = await POST(delivery(fixture, forged));

    expect(response.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects a body altered after signing", async () => {
    const response = await POST(delivery(fixture.replace("49900", "100"), sign(fixture)));

    expect(response.status).toBe(401);
  });
});
