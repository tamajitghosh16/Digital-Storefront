import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@repo/database";
import { resetTestDatabase, testDatabaseUrl } from "@repo/database/testing";
import { createPendingOrder } from "./support/fixtures";

// settleOrderPayment (lib/orders.ts) is the one place an order becomes PAID,
// shared by the webhook and confirmCheckout. These run it against Postgres
// to prove the guarantees its comment promises.

const sent = vi.hoisted(() => [] as unknown[]);
vi.mock("@repo/email", () => ({ sendOrderConfirmation: vi.fn(async (email: unknown) => void sent.push(email)) }));

const { settleOrderPayment } = await import("@/lib/orders");

describe.skipIf(!testDatabaseUrl())("settleOrderPayment", () => {
  beforeEach(async () => {
    await resetTestDatabase(prisma);
    sent.length = 0;
  });
  afterAll(() => prisma.$disconnect());

  it("marks a pending order paid and sends one confirmation", async () => {
    const { order, payment } = await createPendingOrder();

    const outcome = await settleOrderPayment({
      paymentRowId: payment.id,
      orderId: order.id,
      gatewayPaymentId: "pay_1",
      source: "webhook",
    });

    expect(outcome).toBe("settled");
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: "PAID" });
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({
      status: "CAPTURED",
      gatewayPaymentId: "pay_1",
    });
    expect(sent).toEqual([expect.objectContaining({ orderId: order.id })]);
  });

  it("puts a paid order's parcel in the admin approval queue", async () => {
    const { order, payment } = await createPendingOrder();
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ shipmentStatus: null });

    await settleOrderPayment({ paymentRowId: payment.id, orderId: order.id, gatewayPaymentId: "pay_1", source: "webhook" });

    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({
      status: "PAID",
      shipmentStatus: "AWAITING_APPROVAL",
    });
  });

  it("is idempotent: the webhook and checkout both settling sends one email", async () => {
    const { order, payment } = await createPendingOrder();
    const settle = (source: "webhook" | "checkout") =>
      settleOrderPayment({ paymentRowId: payment.id, orderId: order.id, gatewayPaymentId: "pay_1", source });

    expect(await settle("checkout")).toBe("settled");
    expect(await settle("webhook")).toBe("already_paid");
    expect(sent).toHaveLength(1);
  });

  it("never resurrects a cancelled order", async () => {
    const { order, payment } = await createPendingOrder();
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });

    const outcome = await settleOrderPayment({
      paymentRowId: payment.id,
      orderId: order.id,
      gatewayPaymentId: "pay_late",
      source: "webhook",
    });

    expect(outcome).toBe("not_pending");
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: "CANCELLED" });
    expect(sent).toEqual([]);
  });

  it("refuses to settle a second order with an already-used Razorpay payment", async () => {
    const first = await createPendingOrder();
    const second = await createPendingOrder();
    await settleOrderPayment({
      paymentRowId: first.payment.id,
      orderId: first.order.id,
      gatewayPaymentId: "pay_replayed",
      source: "webhook",
    });

    const outcome = await settleOrderPayment({
      paymentRowId: second.payment.id,
      orderId: second.order.id,
      gatewayPaymentId: "pay_replayed",
      source: "checkout",
    });

    expect(outcome).toBe("payment_reused");
    expect(await prisma.order.findUnique({ where: { id: second.order.id } })).toMatchObject({ status: "PENDING" });
  });
});
