/**
 * The drawn-jacket gradient for a book that has no uploaded cover.
 *
 * apps/web draws every cover-less book as a 2:3 gradient block (see
 * `BookJacket`), coloured from a `coverFrom`/`coverTo` pair. `Product` has
 * no column for those, so the admin can't read them back — it derives a
 * stable pair here instead, picked from the shared palette by slug, so a
 * book added from the admin looks on-brand and never changes on reload.
 */

/** The on-brand cover gradient pairs, sampled from the storefront palette. */
const PALETTE: Array<{ from: string; to: string }> = [
  { from: "#1b2a4a", to: "#2e74b5" },
  { from: "#4a7c59", to: "#2c4a35" },
  { from: "#b3543f", to: "#7a3626" },
  { from: "#8e4a7c", to: "#4a2a52" },
  { from: "#c9973b", to: "#8a641f" },
  { from: "#34495e", to: "#1b2a4a" },
  { from: "#3f6bb3", to: "#254b85" },
  { from: "#7a8c3f", to: "#4d5a26" },
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function bookCoverGradient(slug: string): { from: string; to: string } {
  const base = slug.replace(/-ebook$/, "");
  return PALETTE[hash(base) % PALETTE.length]!;
}
