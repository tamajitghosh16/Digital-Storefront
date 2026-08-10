/**
 * Top-level URL segments apps/web already owns as static routes. Next.js
 * always resolves a static folder before the [slug] catch-all, so a
 * category/product slug that collides with one of these would silently be
 * unreachable — reject it at creation time instead of shipping a dead link.
 */
export const RESERVED_SLUGS = [
  "books",
  "ebooks",
  "services",
  "self-publishing",
  "checkout",
  "cart",
  "sign-in",
  "account",
  "unauthorized",
  "catalog",
  "educational-charts",
  "worksheets-activity-puzzles",
  "teaching-learning-materials",
  "advocate-diary",
  "naya-bandhu",
  "digital-tracking-system",
  "bulk-publishing",
  "indoor-plants",
  "api",
];
