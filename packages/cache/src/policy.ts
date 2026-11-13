/**
 * How long cached data may live without an explicit invalidation — the
 * worst case a shopper or staff member sees when a "refresh now" signal is
 * lost (storefront asleep, network error). Normally every change expires
 * its entries at once through tags (see ./tags.ts), so these are backstops,
 * not the freshness anyone usually experiences.
 *
 * Decided in docs/adr/0001-caching-strategy.md: five minutes for anything a
 * shopper sees. Checkout never reads cached data, so a stale figure here
 * can change what's shown, never what's charged.
 */
export const TTL = {
  /** Product listings, detail pages, related rows, cart covers. */
  catalogue: 300,
  /** Site settings, copy, navigation, menu, banners, FAQs, testimonials, pricing shown for display. */
  cms: 300,
  /** apps/admin's dashboard and analytics aggregates. */
  adminStats: 60,
} as const;

/**
 * Printed copies at or above which a title counts as "same-day Kolkata"
 * stock — the listing's `avail=same-day` filter. Shared so the filter and
 * the stock-change invalidation (which re-lists a title that crosses it)
 * can never disagree.
 */
export const SAME_DAY_MIN = 30;

/**
 * Below this many printed copies a listing tile shows the exact count
 * ("Only 3 left"). An order that leaves a title under it re-lists the title
 * at once (./tags.ts `stockTakenTags`), so a count on screen is never stale.
 */
export const LOW_STOCK_MAX = 10;
