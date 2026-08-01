// Formatting helpers shared by both storefront skins (classic + vista).

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 249900 → "₹2,499.00" (Indian digit grouping: ₹1,52,046.00 above a lakh). */
export function formatINR(priceCents: number): string {
  return inr.format(priceCents / 100);
}

/** 249900 → "₹2,499" — for dense promo labels where the paise are noise. */
export function formatINRWhole(priceCents: number): string {
  return inrWhole.format(priceCents / 100);
}

/** "The Salt Road" → "TS" — initials used on placeholder cover tiles. */
export function initialsOf(title: string): string {
  return title
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
