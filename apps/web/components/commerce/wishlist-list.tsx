"use client";
import { useWishlist } from "./wishlist-provider";
import { ProductTile, type ProductTileData } from "./product-tile";

/**
 * Renders the account wishlist page's grid, live-filtered against the
 * shared wishlist context — un-hearting a tile here (or anywhere else on
 * the site, in another tab) drops it from the list immediately instead of
 * waiting for a full page reload.
 */
export function WishlistList({ items, emptyState }: { items: ProductTileData[]; emptyState: React.ReactNode }) {
  const { isWishlisted } = useWishlist();
  const remaining = items.filter((item) => isWishlisted(item.id));

  if (remaining.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid gap-x-6 gap-y-10 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
      {remaining.map((item) => (
        <ProductTile key={item.id} product={item} />
      ))}
    </div>
  );
}
