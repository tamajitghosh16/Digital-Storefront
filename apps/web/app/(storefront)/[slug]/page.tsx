import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { cachedQuery } from "@repo/cache/query";
import { TTL } from "@repo/cache/policy";
import { cmsEntryTags } from "@repo/cache/tags";
import { withFallback } from "@/lib/safe-fetch";
import { DummyPage } from "@/components/marketing/dummy-page";

/**
 * Catch-all landing for anything created from apps/admin's "Products Menu"
 * (MenuCategory/MenuProduct) — a blank page carrying just the name, same
 * shape as the hardcoded DummyPage stubs elsewhere in (storefront). Next.js
 * always resolves a static sibling folder (books, services, …) before
 * falling into this dynamic one, so it only ever catches slugs the admin
 * created.
 */

/**
 * The product or category at this slug, looked up together rather than
 * product-then-category. Cached under `cms:menu`, which any Products Menu
 * save in apps/admin expires — including a miss, so a bot walking random
 * slugs costs one lookup per slug per `TTL.cms`, not two queries per hit.
 * generateMetadata and the page share one lookup per request.
 */
const cachedMenuEntry = cachedQuery({ name: "cms:menu-entry", ttl: TTL.cms, tags: cmsEntryTags("menu") }, (slug: string) =>
  Promise.all([
    prisma.menuProduct.findFirst({
      where: { slug, isActive: true },
      select: { name: true, category: { select: { name: true } } },
    }),
    prisma.menuCategory.findFirst({ where: { slug, isActive: true }, select: { name: true } }),
  ])
);

function loadMenuEntry(slug: string) {
  return withFallback(() => cachedMenuEntry(slug), [null, null] as Awaited<ReturnType<typeof cachedMenuEntry>>);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product, category] = await loadMenuEntry(slug);
  if (product) return { title: product.name };
  if (category) return { title: category.name };
  return {};
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product, category] = await loadMenuEntry(slug);
  if (product) {
    return (
      <DummyPage
        category={product.category.name}
        title={product.name}
        description="This page is a placeholder — content for this product hasn't been added yet."
      />
    );
  }

  if (category) {
    return (
      <DummyPage
        category="Categories"
        title={category.name}
        description="This page is a placeholder — content for this category hasn't been added yet."
      />
    );
  }

  notFound();
}
