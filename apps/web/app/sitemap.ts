import type { MetadataRoute } from "next";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { siteUrl } from "@/lib/site-url";
import { CATALOG_ITEMS } from "@/lib/catalog";
import { LISTING_LINES } from "@/lib/product-lines";
import { POLICY_PAGES } from "@/lib/navigation";

// Rebuilt at most hourly; a new or unpublished product shows up (or drops
// out) on the next rebuild. Admin-created Products Menu pages are left out —
// they're still blank placeholders (`(storefront)/[slug]`).
export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/services",
  "/self-publishing",
  "/bulk-publishing",
  "/advocate-diary",
  "/naya-bandhu",
  "/digital-tracking-system",
  "/indoor-plants",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const products = await withFallback(
    () =>
      prisma.product.findMany({
        where: { isPublished: true },
        select: { slug: true, type: true, productLine: true, updatedAt: true },
      }),
    []
  );

  const lineByProductLine = new Map(Object.values(LISTING_LINES).map((line) => [line.productLine, line]));

  const productEntries: MetadataRoute.Sitemap = products.flatMap((product) => {
    const line = product.productLine ? lineByProductLine.get(product.productLine) : undefined;
    const path = line
      ? `${line.base}/${product.slug}`
      : product.type === "SERVICE_PACKAGE" && !product.productLine
        ? `/services/${product.slug}`
        : null;
    return path ? [{ url: `${base}${path}`, lastModified: product.updatedAt, changeFrequency: "weekly" as const }] : [];
  });

  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${base}${path === "/" ? "" : path}`,
      changeFrequency: "daily" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...Object.values(LISTING_LINES).map((line) => ({
      url: `${base}${line.base}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...CATALOG_ITEMS.map((item) => ({
      url: `${base}/catalog/${item.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...productEntries,
    ...POLICY_PAGES.map((page) => ({
      url: `${base}${page.href}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
