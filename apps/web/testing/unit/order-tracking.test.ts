import { describe, expect, it } from "vitest";
import { buildTrackingTimeline, orderStatusBadge, type OrderDetail } from "@/lib/order-tracking";

// What a customer sees while staff move an order through the admin Sales
// Orders page (Order.shipmentStatus).

function order(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order_1",
    ref: "#der_1",
    status: "PROCESSING",
    shipmentStatus: "AWAITING_APPROVAL",
    createdAt: "2026-10-25T04:00:00.000Z",
    updatedAt: "2026-10-26T04:00:00.000Z",
    subtotalCents: 50_000,
    discountCents: 0,
    discountCode: null,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 50_000,
    shippingAddress: null,
    billingAddress: null,
    gstNumber: null,
    carrier: null,
    trackingNumber: null,
    payment: { method: "COD", status: "CREATED", updatedAt: "2026-10-25T04:00:00.000Z" },
    items: [
      {
        id: "item_1",
        title: "Book 1",
        author: "A",
        href: null,
        coverImageUrl: null,
        fulfillmentType: "SHIP",
        formatLabel: "Paperback",
        includesEbook: false,
        quantity: 1,
        unitPriceCents: 50_000,
      },
    ],
    ...overrides,
  };
}

const current = (detail: OrderDetail) =>
  buildTrackingTimeline(detail, "in 3-5 working days").find((step) => step.state === "current")?.key;

describe("orderStatusBadge", () => {
  it("follows the parcel while it's on its way", () => {
    expect(orderStatusBadge(order()).label).toBe("Awaiting confirmation");
    expect(orderStatusBadge(order({ shipmentStatus: "SHIPPED" })).label).toBe("Shipping");
    expect(orderStatusBadge(order({ shipmentStatus: "OUT_FOR_DELIVERY" })).label).toBe("Out for delivery");
  });

  it("shows a refused order as cancelled", () => {
    expect(orderStatusBadge(order({ status: "CANCELLED", shipmentStatus: "CANCELLED" })).label).toBe("Cancelled");
    // A mixed order whose parcel was refused keeps its PAID status.
    expect(orderStatusBadge(order({ status: "PAID", shipmentStatus: "CANCELLED" })).label).toBe("Cancelled");
  });
});

describe("buildTrackingTimeline", () => {
  it("waits on staff confirmation, then walks the parcel's steps", () => {
    expect(current(order())).toBe("accepted");
    expect(current(order({ shipmentStatus: "PROCESSING" }))).toBe("processing");
    expect(current(order({ shipmentStatus: "OUT_FOR_DELIVERY" }))).toBe("out_for_delivery");
  });

  it("ticks every step once delivered", () => {
    const steps = buildTrackingTimeline(order({ shipmentStatus: "DELIVERED" }), "in 3-5 working days");
    expect(steps.every((step) => step.state === "done")).toBe(true);
  });

  it("stops at a cancellation, telling a mixed order its e-books are kept", () => {
    const steps = buildTrackingTimeline(order({ status: "PAID", shipmentStatus: "CANCELLED" }), "in 3-5 working days");
    const last = steps.at(-1)!;
    expect(last).toMatchObject({ key: "cancelled", state: "stopped" });
    expect(last.description).toMatch(/e-books stay in your digital library/);
  });
});
