"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DiscountTerms } from "@repo/database/discounts";

/** Who the invoice is made out to, and where. */
export interface BillingDetails {
  name: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  state: string;
  pin: string;
}

/**
 * What the cart's Checkout section hands to the /payment page: the delivery
 * and billing details and the discount code the shopper applied. Kept in sessionStorage
 * — it lives for this tab's checkout only, so a delivery address isn't left
 * lying in localStorage — and never trusted by the server, which re-validates
 * every field and re-checks the code when the order is placed.
 */
export interface CheckoutDetails {
  name: string;
  email: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  state: string;
  pin: string;
  gst: string;
  /** Ticked "billing address is the same as delivery"; `billing` is then a copy of the above. */
  billingSameAsShipping: boolean;
  billing: BillingDetails;
}

/**
 * The code's terms as `checkCoupon` returned them — for the on-screen
 * summary only; the server re-checks the code and prices the discount itself.
 */
export type AppliedCoupon = DiscountTerms;

interface CheckoutState {
  details: CheckoutDetails | null;
  coupon: AppliedCoupon | null;
  setCheckout: (details: CheckoutDetails, coupon: AppliedCoupon | null) => void;
  clear: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      details: null,
      coupon: null,
      setCheckout: (details, coupon) => set({ details, coupon }),
      clear: () => set({ details: null, coupon: null }),
    }),
    // v1: `coupon` changed from {code, rate} to the full DiscountTerms; an
    // older tab's stored coupon is dropped rather than misread.
    // v2: details gained a billing address; an older tab's details are
    // dropped, so /payment sends the shopper back to the cart to fill it in.
    {
      name: "checkout-details",
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      migrate: (persisted, version) => ({
        ...(persisted as CheckoutState),
        ...(version < 1 && { coupon: null }),
        ...(version < 2 && { details: null }),
      }),
    }
  )
);
