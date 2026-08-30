// Currency formatting shared across the storefront.

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 249900 → "₹2,499" — for dense promo labels where the paise are noise. */
export function formatINRWhole(priceCents: number): string {
  return inrWhole.format(priceCents / 100);
}
