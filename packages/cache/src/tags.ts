import type { ProductLine, ProductType } from "@repo/database";
import { LOW_STOCK_MAX, SAME_DAY_MIN } from "./policy";

/**
 * The cache-tag taxonomy shared by both apps: apps/web tags what it caches,
 * apps/admin and checkout name what they changed, and the two meet here so
 * a name can never drift between them. Pure data and string helpers — safe
 * anywhere.
 *
 * Every cached entry carries an umbrella tag (`cms` or `catalogue`) plus
 * the narrow tags of what it was built from. A change expires only the
 * narrow tags, so editing an FAQ no longer empties the catalogue and an
 * order no longer empties every listing. The umbrellas exist for "expire
 * everything" — an old admin deploy's bare ping, or an operator.
 *
 * Full rationale: docs/adr/0001-caching-strategy.md.
 */

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------

export const CMS_TAG = "cms";

export const CMS_SECTION_TAGS = {
  /** SiteSettings: name, logo, SEO defaults, contact details. */
  settings: "cms:settings",
  /** PricingSettings + ClassSetTier, as shown for display. */
  pricing: "cms:pricing",
  /** ContentBlock overrides (homepage and policy copy). */
  content: "cms:content",
  /** NavLink rows (header/footer links). */
  nav: "cms:nav",
  /** MenuCategory, MenuProduct and DepartmentVisibility. */
  menu: "cms:menu",
  banners: "cms:banners",
  testimonials: "cms:testimonials",
  faqs: "cms:faqs",
} as const;

export type CmsSection = keyof typeof CMS_SECTION_TAGS;

/** Tags for a cached read of one CMS section. */
export function cmsEntryTags(section: CmsSection): string[] {
  return [CMS_TAG, CMS_SECTION_TAGS[section]];
}

/** Tags to expire after a CMS section changed. */
export function cmsChangedTags(...sections: CmsSection[]): string[] {
  return unique(sections.map((section) => CMS_SECTION_TAGS[section]));
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const CATALOGUE_TAG = "catalogue";

/** Product cover images, read by id for the cart (they can't know a product's line up front). */
export const COVERS_TAG = "catalogue:covers";

/**
 * Which listing a product appears in: its product line, or `services` for a
 * service package outside the taxonomy (the `/services` page). A row with
 * neither appears in no listing.
 */
export type CatalogueGroup = ProductLine | "services";

const CATALOGUE_GROUPS: ReadonlySet<string> = new Set<CatalogueGroup>([
  "BOOK",
  "EDUCATIONAL_CHART",
  "WORKSHEET_ACTIVITY_PUZZLE",
  "TEACHING_LEARNING_MATERIAL",
  "ADVOCATE_DIARY",
  "NAYA_BANDHU_APP",
  "DIGITAL_TRACKING_SYSTEM",
  "INDOOR_PLANT",
  "services",
]);

export function catalogueGroupTag(group: CatalogueGroup): string {
  return `catalogue:${group}`;
}

export function productTag(slug: string): string {
  return `product:${slug}`;
}

/** The fields that decide which entries a product appears in. */
export interface ProductRef {
  slug: string;
  productLine: ProductLine | null;
  type: ProductType;
}

export function catalogueGroupOf(product: Pick<ProductRef, "productLine" | "type">): CatalogueGroup | null {
  if (product.productLine) return product.productLine;
  return product.type === "SERVICE_PACKAGE" ? "services" : null;
}

/** Tags for a cached listing, count, or "related" row of one group. */
export function listingEntryTags(group: CatalogueGroup): string[] {
  return [CATALOGUE_TAG, catalogueGroupTag(group)];
}

/** Tags for a cached single-product read, looked up by slug. */
export function productEntryTags(group: CatalogueGroup, slug: string): string[] {
  return [CATALOGUE_TAG, catalogueGroupTag(group), productTag(slug)];
}

export const COVER_ENTRY_TAGS: readonly string[] = [CATALOGUE_TAG, COVERS_TAG];

/**
 * Tags to expire after staff create, edit, publish/unpublish or delete a
 * product. Pass the row as it was *and* as it is now: an edit can rename
 * the slug or move a product between listings (the Books form edits
 * service packages too), and both the old and the new entries must go.
 */
export function productChangedTags(...refs: (ProductRef | null | undefined)[]): string[] {
  const tags: string[] = [COVERS_TAG];
  for (const ref of refs) {
    if (!ref) continue;
    const group = catalogueGroupOf(ref);
    if (group) tags.push(catalogueGroupTag(group));
    // `/services` lists every published service package, line or not.
    if (ref.type === "SERVICE_PACKAGE") tags.push(catalogueGroupTag("services"));
    tags.push(productTag(ref.slug));
  }
  return unique(tags);
}

/** One counted stock line an order took copies from. */
export interface StockMove extends ProductRef {
  /** The counter before the order — null when staff don't count this item. */
  before: number | null;
  quantity: number;
}

/**
 * Tags to expire after an order took stock. The product's own page always
 * refreshes, so its buy box shows what's left. Listings refresh only when
 * the move changes what a listing shows: the title is now low on stock (its
 * tile shows the exact count, or "out of stock") or fell below the same-day
 * threshold (the `avail=same-day` filter and badge). Otherwise a tile's
 * stock line — "Ships in 2 days" — can't have changed. The cart and
 * checkout always re-check stock live regardless. Without this, every order
 * would empty every listing it touched.
 */
export function stockTakenTags(moves: readonly StockMove[]): string[] {
  const tags: string[] = [];
  for (const move of moves) {
    tags.push(productTag(move.slug));
    if (move.before === null) continue;
    const after = move.before - move.quantity;
    const lowStock = after < LOW_STOCK_MAX;
    const leftSameDay = move.before >= SAME_DAY_MIN && after < SAME_DAY_MIN;
    const group = catalogueGroupOf(move);
    if ((lowStock || leftSameDay) && group) tags.push(catalogueGroupTag(group));
  }
  return unique(tags);
}

/**
 * Tags to expire after copies came back (a cancelled order, a received
 * purchase order). Rare, and may bring a title back into stock, so its
 * listing refreshes too.
 */
export function stockReturnedTags(refs: readonly ProductRef[]): string[] {
  const tags: string[] = [];
  for (const ref of refs) {
    tags.push(productTag(ref.slug));
    const group = catalogueGroupOf(ref);
    if (group) tags.push(catalogueGroupTag(group));
  }
  return unique(tags);
}

// ---------------------------------------------------------------------------
// Everything, and validation
// ---------------------------------------------------------------------------

/** Expires every cached storefront read. */
export const ALL_TAGS: readonly string[] = [CMS_TAG, CATALOGUE_TAG];

const CMS_TAG_SET: ReadonlySet<string> = new Set(Object.values(CMS_SECTION_TAGS));
const PRODUCT_TAG = /^product:[^\s]{1,200}$/;

/**
 * Whether `tag` is one this taxonomy can produce. The storefront's
 * revalidate endpoint refuses anything else, so a caller can't fill the
 * tag ledger with junk.
 */
export function isAllowedTag(tag: string): boolean {
  if (tag === CMS_TAG || tag === CATALOGUE_TAG || tag === COVERS_TAG) return true;
  if (CMS_TAG_SET.has(tag)) return true;
  if (tag.startsWith("catalogue:")) return CATALOGUE_GROUPS.has(tag.slice("catalogue:".length));
  return PRODUCT_TAG.test(tag);
}

function unique(tags: string[]): string[] {
  return [...new Set(tags)];
}
