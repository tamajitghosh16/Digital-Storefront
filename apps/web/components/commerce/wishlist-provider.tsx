"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { getWishlistedProductIds, toggleWishlist } from "@/lib/actions/wishlist";

/**
 * Session-wide wishlist state, loaded once and shared by every heart button
 * on the page (catalogue tiles, the product page, the account wishlist
 * list) so toggling one updates them all instantly. There's no localStorage
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

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const signedInRef = useRef(false);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        signedInRef.current = Boolean(data.session);
        if (!data.session) return;
        getWishlistedProductIds()
          .then((productIds) => {
            if (active) setIds(new Set(productIds));
          })
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(
    (productId: string) => {
      if (!signedInRef.current) {
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
            // Session expired between mount and click.
            setIds((prev) => {
              const next = new Set(prev);
              if (wasWishlisted) next.add(productId);
              else next.delete(productId);
              return next;
            });
            router.push(`/sign-in?next=${encodeURIComponent(pathname || "/")}`);
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
    [ids, pathname, router]
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
