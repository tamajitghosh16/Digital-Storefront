"use client";
import { Heart } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { useWishlist } from "./wishlist-provider";

/**
 * The heart toggle used on catalogue tiles and the product page. Tiles sit
 * inside a `<Link>`, so a click must never bubble to it — `stopPropagation`
 * plus `preventDefault` keep the tap on the heart from also navigating.
 */
export function WishlistButton({
  productId,
  size = "md",
  className,
}: {
  productId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { isWishlisted, isPending, toggle } = useWishlist();
  const wishlisted = isWishlisted(productId);
  const pending = isPending(productId);

  return (
    <button
      type="button"
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-ground/90 text-ink shadow-book backdrop-blur-sm transition hover:scale-105 hover:bg-ground disabled:pointer-events-none disabled:opacity-70",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className
      )}
    >
      <Heart
        className={cn(size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]", wishlisted && "fill-sale text-sale")}
        strokeWidth={2.25}
      />
    </button>
  );
}
