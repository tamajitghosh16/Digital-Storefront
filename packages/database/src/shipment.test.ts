import { describe, expect, it } from "vitest";
import { deliveryType, hasOnlinePart, nextShipmentStatus } from "./shipment";

describe("nextShipmentStatus", () => {
  it("walks the happy path one step at a time", () => {
    expect(nextShipmentStatus("AWAITING_APPROVAL")).toBe("PROCESSING");
    expect(nextShipmentStatus("PROCESSING")).toBe("SHIPPED");
    expect(nextShipmentStatus("SHIPPED")).toBe("OUT_FOR_DELIVERY");
    expect(nextShipmentStatus("OUT_FOR_DELIVERY")).toBe("DELIVERED");
  });

  it("stops at the end of the line", () => {
    expect(nextShipmentStatus("DELIVERED")).toBeNull();
    expect(nextShipmentStatus("CANCELLED")).toBeNull();
  });
});

describe("deliveryType", () => {
  const ebook = { fulfillmentType: "DIGITAL", includesEbook: true } as const;
  const paperback = { fulfillmentType: "SHIP", includesEbook: false } as const;
  const bundle = { fulfillmentType: "SHIP", includesEbook: true } as const;
  const service = { fulfillmentType: "SERVICE", includesEbook: false } as const;

  it("tells online, offline and mixed orders apart", () => {
    expect(deliveryType([ebook])).toBe("ONLINE");
    expect(deliveryType([service])).toBe("ONLINE");
    expect(deliveryType([paperback])).toBe("OFFLINE");
    expect(deliveryType([paperback, ebook])).toBe("MIXED");
  });

  it("counts a print + e-book bundle as both", () => {
    expect(deliveryType([bundle])).toBe("MIXED");
    expect(hasOnlinePart([bundle])).toBe(true);
  });
});
