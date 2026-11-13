import "server-only";
import {
  CONTENT_DEFAULTS,
  DEFAULT_PRICING_CONFIG,
  getSiteSettings,
  loadContent,
  loadPricingConfig,
  prisma,
  type ContentMap,
  type PricingConfig,
} from "@repo/database";
import { cachedQuery } from "@repo/cache/query";
import { TTL } from "@repo/cache/policy";
import { cmsEntryTags, type CmsSection } from "@repo/cache/tags";

/**
 * Cached reads of the admin-managed CMS data the storefront renders on
 * (nearly) every page: site settings, pricing display, copy, footer links,
 * the Products Menu, department visibility, and the homepage's banners,
 * testimonials and FAQs.
 *
 * Why: the shared Postgres is a Supabase pooler a round trip away, and
 * uncached the header, footer and metadata alone made ~10 queries per page
 * view for data that changes a few times a week.
 *
 * Freshness: each reader carries the `cms` umbrella tag plus its own
 * section's (`cms:faqs`, `cms:menu`, … — packages/cache/src/tags.ts), and
 * apps/admin expires exactly the section it saved (apps/admin/lib/
 * storefront-cache.ts). `TTL.cms` is only the backstop for a lost signal.
 * The caching layers themselves live in `cachedQuery()` (@repo/cache/query):
 * per-request dedupe, in-flight coalescing, and Next's data cache — in
 * Redis when `CACHE_STORE=redis`.
 *
 * Deliberately NOT cached here: products, stock and prices (those go
 * through `lib/products-cache.ts`, under their own tags), and anything
 * checkout uses to compute a charge — checkout actions and the cart call
 * `getPricingConfig()` directly.
 *
 * A database error is never cached: content and pricing are read with the
 * throwing loaders inside the cache, and fall back to the shipped defaults
 * outside it, so a blip costs one page its overrides rather than pinning
 * the defaults for `TTL.cms`.
 *
 * Values round-trip through JSON, so rows are returned without their
 * `createdAt`/`updatedAt` Dates rather than with Date-typed fields that
 * would really be strings.
 */

function cmsRead<R>(name: string, section: CmsSection, query: () => Promise<R>): () => Promise<R> {
  return cachedQuery({ name: `cms:${name}`, ttl: TTL.cms, tags: cmsEntryTags(section) }, query);
}

type Timestamped = { createdAt?: Date; updatedAt?: Date };
type WithoutTimestamps<T> = Omit<T, "createdAt" | "updatedAt">;

function withoutTimestamps<T extends Timestamped>(row: T): WithoutTimestamps<T> {
  const copy: Partial<T> = { ...row };
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy as WithoutTimestamps<T>;
}

/** Throws on a database error — callers wrap it in `withFallback()`. */
export const getCachedSiteSettings = cmsRead("site-settings", "settings", async () =>
  withoutTimestamps(await getSiteSettings())
);

const cachedPricingConfig = cmsRead("pricing", "pricing", () => loadPricingConfig());

/** For display only (promo bar, buy box). Never price a charge off this — see above. */
export async function getCachedPricingConfig(): Promise<PricingConfig> {
  try {
    return await cachedPricingConfig();
  } catch (error) {
    console.error("[cms] pricing settings unavailable; showing the defaults", error);
    return DEFAULT_PRICING_CONFIG;
  }
}

const cachedContent = cmsRead("content", "content", () => loadContent());

/** Never throws: the shipped copy stands in when the database can't be read. */
export async function getCachedContent(): Promise<ContentMap> {
  try {
    return await cachedContent();
  } catch (error) {
    console.error("[cms] page copy unavailable; showing the defaults", error);
    return CONTENT_DEFAULTS;
  }
}

export const getCachedFooterLinks = cmsRead("footer-links", "nav", async () =>
  (
    await prisma.navLink.findMany({ where: { location: "FOOTER", isActive: true }, orderBy: { order: "asc" } })
  ).map(withoutTimestamps)
);

/** Active Products Menu categories with their active products, in menu order. */
export const getCachedMenuCategories = cmsRead("menu-categories", "menu", async () =>
  (
    await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: { products: { where: { isActive: true }, orderBy: { order: "asc" } } },
    })
  ).map((category) => ({ ...withoutTimestamps(category), products: category.products.map(withoutTimestamps) }))
);

/** Keys of the built-in departments an operator has hidden from the department bar. */
export const getCachedHiddenDepartmentKeys = cmsRead("hidden-departments", "menu", async () =>
  (await prisma.departmentVisibility.findMany({ where: { hidden: true }, select: { key: true } })).map(
    (row) => row.key
  )
);

export const getCachedBanners = cmsRead("banners", "banners", async () =>
  (await prisma.banner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } })).map(withoutTimestamps)
);

export const getCachedTestimonials = cmsRead("testimonials", "testimonials", async () =>
  (await prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { order: "asc" } })).map(
    withoutTimestamps
  )
);

export const getCachedFaqs = cmsRead("faqs", "faqs", async () =>
  (await prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } })).map(withoutTimestamps)
);
