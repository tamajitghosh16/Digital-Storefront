import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getContent, getPricingConfig, getSiteSettings, prisma } from "@repo/database";

/**
 * Cached reads of the admin-managed CMS data the storefront renders on
 * (nearly) every page: site settings, pricing display, copy, footer links,
 * the Products Menu, department visibility, and the homepage's banners,
 * testimonials and FAQs.
 *
 * Why: the shared Postgres is a Supabase pooler in another region, where a
 * single query costs a few hundred milliseconds. Uncached, the header,
 * footer and metadata alone made ~10 queries per page view for data that
 * changes a few times a week.
 *
 * Freshness: everything here carries {@link CMS_CACHE_TAG}. apps/admin's CMS
 * Server Actions call this app's `/api/revalidate` after every save (see
 * apps/admin/lib/storefront-cache.ts), which expires the tag immediately.
 * {@link CMS_REVALIDATE_SECONDS} is only the backstop for when that ping
 * never arrives, e.g. `STOREFRONT_REVALIDATE_SECRET` unset in local dev.
 *
 * Deliberately NOT cached here: products, stock and prices (those go
 * through `lib/products-cache.ts`, under their own tag), and anything
 * checkout uses to compute a charge — checkout actions and the cart call
 * `getPricingConfig()` directly.
 *
 * `unstable_cache` round-trips values through JSON, so rows are returned
 * without their `createdAt`/`updatedAt` Dates rather than with Date-typed
 * fields that would really be strings. Each reader is also wrapped in React
 * `cache()` so concurrent callers in one render (metadata, header, footer)
 * share a single cache lookup — and, on a miss, a single query.
 */

export const CMS_CACHE_TAG = "cms";
const CMS_REVALIDATE_SECONDS = 60;

function cmsCache<T>(key: string, fn: () => Promise<T>): () => Promise<T> {
  return cache(unstable_cache(fn, ["cms", key], { tags: [CMS_CACHE_TAG], revalidate: CMS_REVALIDATE_SECONDS }));
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
export const getCachedSiteSettings = cmsCache("site-settings", async () =>
  withoutTimestamps(await getSiteSettings())
);

/** For display only (promo bar, buy box). Never price a charge off this — see above. */
export const getCachedPricingConfig = cmsCache("pricing", () => getPricingConfig());

export const getCachedContent = cmsCache("content", () => getContent());

export const getCachedFooterLinks = cmsCache("footer-links", async () =>
  (
    await prisma.navLink.findMany({ where: { location: "FOOTER", isActive: true }, orderBy: { order: "asc" } })
  ).map(withoutTimestamps)
);

/** Active Products Menu categories with their active products, in menu order. */
export const getCachedMenuCategories = cmsCache("menu-categories", async () =>
  (
    await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: { products: { where: { isActive: true }, orderBy: { order: "asc" } } },
    })
  ).map((category) => ({ ...withoutTimestamps(category), products: category.products.map(withoutTimestamps) }))
);

/** Keys of the built-in departments an operator has hidden from the department bar. */
export const getCachedHiddenDepartmentKeys = cmsCache("hidden-departments", async () =>
  (await prisma.departmentVisibility.findMany({ where: { hidden: true }, select: { key: true } })).map(
    (row) => row.key
  )
);

export const getCachedBanners = cmsCache("banners", async () =>
  (await prisma.banner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } })).map(withoutTimestamps)
);

export const getCachedTestimonials = cmsCache("testimonials", async () =>
  (await prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { order: "asc" } })).map(
    withoutTimestamps
  )
);

export const getCachedFaqs = cmsCache("faqs", async () =>
  (await prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } })).map(withoutTimestamps)
);
