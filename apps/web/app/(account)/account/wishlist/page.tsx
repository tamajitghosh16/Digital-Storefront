import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { SectionHead, buttonClass } from "@/components/primitives";
import { WishlistList } from "@/components/commerce/wishlist-list";
import type { ProductTileData } from "@/components/commerce/product-tile";

export const metadata: Metadata = { title: "Wishlist" };

// FR-2.x: saved titles. The Wishlist model is a plain (user, product)
// join — see packages/database/prisma/schema.prisma — so this just reads it
// back joined to Product and hands the tiles to the client-side list, which
// stays in sync with the shared wishlist context as hearts are toggled.
export default async function WishlistPage() {
  const user = await getCurrentUser();

  const rows = user
    ? await prisma.wishlist.findMany({
        where: { userId: user.id },
        include: { product: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const items: ProductTileData[] = rows
    .filter((row) => row.product.isPublished)
    .map((row) => {
      const product = row.product;
      return {
        id: product.id,
        type: product.type,
        title: product.title,
        author: product.author,
        slug: product.slug,
        priceCents: product.priceCents,
        coverImageUrl: product.coverImageUrl,
        stockQty: product.stockQty,
        genre: product.genre ?? undefined,
        rating: product.reviewCount > 0 ? product.ratingAvg : undefined,
        reviewCount: product.reviewCount > 0 ? product.reviewCount : undefined,
      };
    });

  const emptyState = (
    <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
      <h3>Your wishlist is empty</h3>
      <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
        Save books, charts and kits while you browse and they&rsquo;ll gather here, ready to buy when you are.
      </p>
      <Link href="/educational-material/books" className={buttonClass("secondary", "md", "mt-5")}>
        Browse the catalogue
      </Link>
    </div>
  );

  return (
    <section>
      <SectionHead title="Wishlist" standfirst="Titles you've saved for later." />
      <WishlistList items={items} emptyState={emptyState} />
    </section>
  );
}
