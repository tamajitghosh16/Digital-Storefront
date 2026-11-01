"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getWishlistedProductIds, toggleWishlist } from "@/lib/actions/wishlist";

/**
 * Session-wide wishlist state, loaded once and shared by every heart button
 * on the page (catalogue tiles, the product page, the account wishlist
 * list) so toggling one updates them all instantly. Reloaded whenever the
 * signed-in account changes (`userId` comes from the root layout), so a
 * signed-out visitor never sees the previous account's hearts. There's no localStorage
 * fallback like `cart-store` — a wishlist only makes sense tied to an
 * account, so a signed-out visitor sees every heart unfilled and is sent to
 * sign in on click.
 */

interface WishlistContextValue {
  isWishlisted: (productId: string) => boolean;
  isPending: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

// Never mutated — every update copies it first.
const NO_IDS = new Set<string>();

export function WishlistProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Tagged with the account it was loaded for, so a change of account shows
  // an empty wishlist straight away rather than the previous one's.
  const [wishlist, setWishlist] = useState<{ userId: string | null; ids: Set<string> }>({
    userId: null,
    ids: new Set(),
  });
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const ids = wishlist.userId === userId ? wishlist.ids : NO_IDS;
  const setIds = useCallback(
    (update: (prev: Set<string>) => Set<string>) =>
      setWishlist((prev) => ({ userId, ids: update(prev.userId === userId ? prev.ids : NO_IDS) })),
    [userId]
  );

  useEffect(() => {
    let active = true;
    if (!userId) return;
    getWishlistedProductIds()
      .then((productIds) => {
        if (active) setWishlist({ userId, ids: new Set(productIds) });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    (productId: string) => {
      if (!userId) {
        router.push(`/sign-in?next=${encodeURIComponent(pathname || "/")}`);
        return;
      }

      const wasWishlisted = ids.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.delete(productId);
        else next.add(productId);
        return next;
      });
      setPendingIds((prev) => new Set(prev).add(productId));

      toggleWishlist(productId)
        .then((result) => {
          if (!result.ok) {
            setIds((prev) => {
              const next = new Set(prev);
              if (wasWishlisted) next.add(productId);
              else next.delete(productId);
              return next;
            });
            // Session expired between mount and click. (Rate-limited or
            // unknown products just roll back the optimistic toggle.)
            if (result.error === "SIGN_IN_REQUIRED") {
              router.push(`/sign-in?next=${encodeURIComponent(pathname || "/")}`);
            }
          }
        })
        .catch(() => {
          setIds((prev) => {
            const next = new Set(prev);
            if (wasWishlisted) next.add(productId);
            else next.delete(productId);
            return next;
          });
        })
        .finally(() => {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
        });
    },
    [ids, pathname, router, setIds, userId]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      isWishlisted: (productId) => ids.has(productId),
      isPending: (productId) => pendingIds.has(productId),
      toggle,
    }),
    [ids, pendingIds, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
