import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@repo/database";
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
 * product-then-category, and `cache()`d so generateMetadata and the page
 * share the one pair of queries.
 */
const loadMenuEntry = cache((slug: string) =>
  Promise.all([
    withFallback(
      () => prisma.menuProduct.findFirst({ where: { slug, isActive: true }, include: { category: true } }),
      null
    ),
    withFallback(() => prisma.menuCategory.findFirst({ where: { slug, isActive: true } }), null),
  ])
);

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
