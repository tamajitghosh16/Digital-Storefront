import { describe, expect, it } from "vitest";
import {
  describeDiscount,
  discountAmountCents,
  discountRejection,
  discountStatus,
  gstAfterDiscountCents,
  type DiscountRules,
} from "./discounts";

const percent10: DiscountRules = {
  code: "SAVE10",
  type: "PERCENT",
  rateBps: 1000,
  amountOffCents: 0,
  maxDiscountCents: null,
  minOrderCents: 0,
  isActive: true,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  perCustomerLimit: null,
};

const flat100: DiscountRules = { ...percent10, code: "FLAT100", type: "FLAT", rateBps: 0, amountOffCents: 10_000 };

const now = new Date("2026-10-25T12:00:00Z");

describe("discountAmountCents", () => {
  it("takes a percentage off the subtotal", () => {
    expect(discountAmountCents(percent10, 50_000)).toBe(5_000);
  });

  it("rounds a percentage to the nearest paisa", () => {
    expect(discountAmountCents({ ...percent10, rateBps: 333 }, 9_999)).toBe(333);
  });

  it("caps a percentage at the maximum discount", () => {
    expect(discountAmountCents({ ...percent10, maxDiscountCents: 2_000 }, 50_000)).toBe(2_000);
    expect(discountAmountCents({ ...percent10, maxDiscountCents: 20_000 }, 50_000)).toBe(5_000);
  });

  it("takes a flat amount off, ignoring any cap", () => {
    expect(discountAmountCents({ ...flat100, maxDiscountCents: 10 }, 50_000)).toBe(10_000);
  });

  it("never takes off more than the subtotal", () => {
    expect(discountAmountCents(flat100, 6_000)).toBe(6_000);
    expect(discountAmountCents({ ...percent10, rateBps: 10_000 }, 6_000)).toBe(6_000);
  });

  it("takes nothing off below the minimum order, and applies at exactly the minimum", () => {
    const min = { ...flat100, minOrderCents: 50_000 };
    expect(discountAmountCents(min, 49_999)).toBe(0);
    expect(discountAmountCents(min, 50_000)).toBe(10_000);
  });

  it("takes nothing off an empty cart", () => {
    expect(discountAmountCents(flat100, 0)).toBe(0);
  });
});

describe("discountRejection", () => {
  const usage = { now, redemptions: 0 };

  it("accepts a plain active code", () => {
    expect(discountRejection(percent10, usage)).toBeNull();
  });

  it("refuses a code that's switched off", () => {
    expect(discountRejection({ ...percent10, isActive: false }, usage)).toBe("INACTIVE");
  });

  it("refuses a code before it starts and after it ends", () => {
    expect(discountRejection({ ...percent10, startsAt: new Date("2026-10-26T00:00:00Z") }, usage)).toBe("NOT_STARTED");
    expect(discountRejection({ ...percent10, expiresAt: new Date("2026-10-25T11:59:59Z") }, usage)).toBe("EXPIRED");
    expect(
      discountRejection(
        { ...percent10, startsAt: new Date("2026-10-01T00:00:00Z"), expiresAt: new Date("2026-10-31T00:00:00Z") },
        usage
      )
    ).toBeNull();
  });

  it("refuses a code once its total uses are taken", () => {
    const limited = { ...percent10, usageLimit: 3 };
    expect(discountRejection(limited, { now, redemptions: 2 })).toBeNull();
    expect(discountRejection(limited, { now, redemptions: 3 })).toBe("USED_UP");
  });

  it("refuses a customer who has used up their own allowance", () => {
    const oncePerCustomer = { ...percent10, perCustomerLimit: 1 };
    expect(discountRejection(oncePerCustomer, { now, redemptions: 5, customerRedemptions: 0 })).toBeNull();
    expect(discountRejection(oncePerCustomer, { now, redemptions: 5, customerRedemptions: 1 })).toBe("CUSTOMER_LIMIT");
  });

  it("skips the per-customer check when the customer isn't known yet", () => {
    expect(discountRejection({ ...percent10, perCustomerLimit: 1 }, { now, redemptions: 5 })).toBeNull();
  });
});

describe("gstAfterDiscountCents", () => {
  it("shrinks the included GST by the fraction the subtotal shrank", () => {
    expect(gstAfterDiscountCents(1_800, 11_800, 1_180)).toBe(1_620);
  });

  it("leaves GST alone when nothing comes off", () => {
    expect(gstAfterDiscountCents(1_800, 11_800, 0)).toBe(1_800);
  });
});

describe("describeDiscount / discountStatus", () => {
  it("words a code the way the admin list shows it", () => {
    expect(describeDiscount(percent10)).toBe("10% off");
    expect(describeDiscount({ ...percent10, maxDiscountCents: 20_000 })).toBe("10% off (up to ₹200)");
    expect(describeDiscount(flat100)).toBe("₹100 off");
  });

  it("sorts a code into the admin list's status", () => {
    expect(discountStatus(percent10, now, 0)).toBe("ACTIVE");
    expect(discountStatus({ ...percent10, isActive: false }, now, 0)).toBe("OFF");
    expect(discountStatus({ ...percent10, startsAt: new Date("2027-01-01") }, now, 0)).toBe("SCHEDULED");
    expect(discountStatus({ ...percent10, expiresAt: new Date("2026-01-01") }, now, 0)).toBe("EXPIRED");
    expect(discountStatus({ ...percent10, usageLimit: 1 }, now, 1)).toBe("USED_UP");
  });
});
